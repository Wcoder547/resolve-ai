import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { searchKnowledgeChunks } from "../knowledge/knowledge.service.js";
import { callAIRagChatService } from "./chat.ai-client.js";
import type { AskQuestionInput } from "./chat.validation.js";

type RetrievedChunk = Awaited<
  ReturnType<typeof searchKnowledgeChunks>
>["chunks"][number];

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId,
    },
    include: {
      organization: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!membership) {
    const error = new Error("No organization found for this user.");
    error.name = "NotFoundError";
    throw error;
  }

  return membership;
}

function createConversationTitle(question: string) {
  const cleaned = question.trim();

  if (cleaned.length > 60) {
    return `${cleaned.slice(0, 60)}...`;
  }

  return cleaned;
}

function buildRetrievalQuery(question: string) {
  const stopWords = new Set([
    "what",
    "should",
    "support",
    "agent",
    "team",
    "do",
    "does",
    "did",
    "the",
    "is",
    "are",
    "was",
    "were",
    "but",
    "and",
    "or",
    "if",
    "then",
    "when",
    "why",
    "how",
    "to",
    "for",
    "of",
    "in",
    "on",
    "with",
    "a",
    "an",
    "please",
    "tell",
    "explain",
  ]);

  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !stopWords.has(word));

  const uniqueWords = Array.from(new Set(words));

  const query = uniqueWords.slice(0, 14).join(" ");

  return query || question;
}

function trimContext(context: string) {
  if (context.length <= env.RAG_MAX_CONTEXT_CHARS) {
    return context;
  }

  return `${context.slice(0, env.RAG_MAX_CONTEXT_CHARS)}\n\n[Context trimmed for model safety]`;
}

function mergeUniqueChunks(chunks: RetrievedChunk[]) {
  const map = new Map<string, RetrievedChunk>();

  for (const chunk of chunks) {
    if (!map.has(chunk.id)) {
      map.set(chunk.id, chunk);
    }
  }

  return Array.from(map.values());
}

async function retrieveRelevantChunks(
  userId: string,
  question: string,
  limit: number,
) {
  const retrievalQuery = buildRetrievalQuery(question);

  const primaryResult = await searchKnowledgeChunks(userId, {
    query: retrievalQuery,
    limit,
  });

  if (primaryResult.chunks.length > 0) {
    return {
      retrievalQuery,
      searchResult: primaryResult,
    };
  }

  const fallbackResult =
    retrievalQuery !== question
      ? await searchKnowledgeChunks(userId, {
          query: question,
          limit,
        })
      : primaryResult;

  return {
    retrievalQuery,
    searchResult: {
      ...fallbackResult,
      chunks: mergeUniqueChunks(fallbackResult.chunks),
      context: fallbackResult.context,
    },
  };
}

async function writeChatAuditLog(input: {
  userId?: string | null;
  organizationId?: string | null;
  action: string;
  metadata?: Record<string, unknown>;
}) {
  await prisma.auditLog.create({
    data: {
      userId: input.userId || null,
      organizationId: input.organizationId || null,
      action: input.action,
      metadata: (input.metadata || {}) as Prisma.InputJsonValue,
    },
  });
}

function createNoContextAnswer() {
  return [
    "I could not find relevant information in your uploaded knowledge base.",
    "",
    "Please upload and ingest a related document first, or ask a question that matches the existing knowledge base.",
  ].join("\n");
}

export async function askRagQuestion(userId: string, input: AskQuestionInput) {
  const membership = await getPrimaryMembership(userId);

  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: membership.organizationId,
        },
      })
    : null;

  if (input.conversationId && !conversation) {
    const error = new Error("Conversation not found.");
    error.name = "NotFoundError";
    throw error;
  }

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId: membership.organizationId,
        userId,
        title: createConversationTitle(input.question),
      },
    });
  }

  await prisma.message.create({
    data: {
      organizationId: membership.organizationId,
      conversationId: conversation.id,
      userId,
      role: "USER",
      content: input.question,
    },
  });

  const limit = input.limit ?? 5;

  const { retrievalQuery, searchResult } = await retrieveRelevantChunks(
    userId,
    input.question,
    limit,
  );

  const topScore = searchResult.chunks[0]?.score ?? 0;

  if (
    searchResult.chunks.length === 0 ||
    topScore < env.RAG_MIN_RELEVANCE_SCORE
  ) {
    const fallbackAnswer = createNoContextAnswer();

    const assistantMessage = await prisma.message.create({
      data: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: fallbackAnswer,
        sources: [],
        metadata: {
          grounded: false,
          reason: "NO_RELEVANT_CHUNKS_FOUND",
          originalQuestion: input.question,
          retrievalQuery,
          topScore,
        } as Prisma.InputJsonValue,
      },
    });

    await writeChatAuditLog({
      userId,
      organizationId: membership.organizationId,
      action: "CHAT_NO_RELEVANT_CONTEXT",
      metadata: {
        conversationId: conversation.id,
        question: input.question,
        retrievalQuery,
        topScore,
      },
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer: fallbackAnswer,
      sources: [],
      retrievedChunks: [],
      grounded: false,
      model: null,
      provider: null,
      retrievalQuery,
    };
  }

  const sources = searchResult.chunks.map((chunk) => ({
    sourceId: chunk.source.id,
    sourceName: chunk.source.name,
    documentId: chunk.document.id,
    documentTitle: chunk.document.title,
    chunkId: chunk.id,
    chunkIndex: chunk.chunkIndex,
    score: chunk.score,
  }));

  try {
    const aiResponse = await callAIRagChatService({
      question: input.question,
      context: trimContext(searchResult.context),
      sources,
      metadata: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        userId,
        retrievalQuery,
        totalRetrievedChunks: searchResult.chunks.length,
        topScore,
      },
    });

    const assistantMessage = await prisma.message.create({
      data: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: aiResponse.data.answer,
        sources: sources as Prisma.InputJsonValue,
        metadata: {
          model: aiResponse.data.model,
          provider: aiResponse.data.provider,
          grounded: aiResponse.data.grounded,
          fallbackUsed: aiResponse.data.fallbackUsed || false,
          providerErrors: aiResponse.data.providerErrors || [],
          agentPlan: aiResponse.data.agentPlan || null,
          quality: aiResponse.data.quality || null,
          originalQuestion: input.question,
          retrievalQuery,
          totalRetrievedChunks: searchResult.chunks.length,
          topScore,
        } as Prisma.InputJsonValue,
      },
    });

    await writeChatAuditLog({
      userId,
      organizationId: membership.organizationId,
      action: "CHAT_RAG_ANSWER_GENERATED",
      metadata: {
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        provider: aiResponse.data.provider,
        model: aiResponse.data.model,
        grounded: aiResponse.data.grounded,
        fallbackUsed: aiResponse.data.fallbackUsed || false,
        retrievalQuery,
        totalRetrievedChunks: searchResult.chunks.length,
        topScore,
      },
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer: aiResponse.data.answer,
      sources,
      retrievedChunks: searchResult.chunks,
      grounded: aiResponse.data.grounded,
      model: aiResponse.data.model,
      provider: aiResponse.data.provider,
      fallbackUsed: aiResponse.data.fallbackUsed || false,
      providerErrors: aiResponse.data.providerErrors || [],
      agentPlan: aiResponse.data.agentPlan || null,
      quality: aiResponse.data.quality || null,
      retrievalQuery,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown AI chat error.";

    const fallbackAnswer = [
      "I found relevant knowledge base context, but the AI service failed while generating the final answer.",
      "",
      "Please try again. If the issue continues, check the AI provider configuration or service logs.",
    ].join("\n");

    const assistantMessage = await prisma.message.create({
      data: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: fallbackAnswer,
        sources: sources as Prisma.InputJsonValue,
        metadata: {
          grounded: false,
          reason: "AI_GENERATION_FAILED",
          error: errorMessage,
          originalQuestion: input.question,
          retrievalQuery,
          totalRetrievedChunks: searchResult.chunks.length,
          topScore,
        } as Prisma.InputJsonValue,
      },
    });

    await writeChatAuditLog({
      userId,
      organizationId: membership.organizationId,
      action: "CHAT_AI_GENERATION_FAILED",
      metadata: {
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        error: errorMessage,
        retrievalQuery,
        totalRetrievedChunks: searchResult.chunks.length,
        topScore,
      },
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer: fallbackAnswer,
      sources,
      retrievedChunks: searchResult.chunks,
      grounded: false,
      model: null,
      provider: null,
      retrievalQuery,
    };
  }
}

export async function listChatConversations(userId: string) {
  const membership = await getPrimaryMembership(userId);

  const conversations = await prisma.conversation.findMany({
    where: {
      organizationId: membership.organizationId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  return conversations.map((conversation) => ({
    id: conversation.id,
    title: conversation.title,
    messagesCount: conversation._count.messages,
    lastMessage: conversation.messages[0]
      ? {
          id: conversation.messages[0].id,
          role: conversation.messages[0].role,
          content: conversation.messages[0].content,
          createdAt: conversation.messages[0].createdAt,
        }
      : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
  }));
}

export async function getChatConversationById(
  userId: string,
  conversationId: string,
) {
  const membership = await getPrimaryMembership(userId);

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: membership.organizationId,
      userId,
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  if (!conversation) {
    const error = new Error("Conversation not found.");
    error.name = "NotFoundError";
    throw error;
  }

  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt,
    messages: conversation.messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      sources: message.sources,
      metadata: message.metadata,
      createdAt: message.createdAt,
    })),
  };
}

export async function deleteChatConversation(
  userId: string,
  conversationId: string,
) {
  const membership = await getPrimaryMembership(userId);

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: membership.organizationId,
      userId,
    },
  });

  if (!conversation) {
    const error = new Error("Conversation not found.");
    error.name = "NotFoundError";
    throw error;
  }

  await prisma.$transaction(async (tx) => {
    await tx.conversation.delete({
      where: {
        id: conversation.id,
      },
    });

    await tx.auditLog.create({
      data: {
        userId,
        organizationId: membership.organizationId,
        action: "CHAT_CONVERSATION_DELETED",
        metadata: {
          conversationId: conversation.id,
          title: conversation.title,
        } as Prisma.InputJsonValue,
      },
    });
  });

  return true;
}
