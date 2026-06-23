import { Prisma } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import { searchKnowledgeChunks } from "../knowledge/knowledge.service.js";
import { callAIRagChatService } from "./chat.ai-client.js";
import type { AskQuestionInput } from "./chat.validation.js";

async function getPrimaryMembership(userId: string) {
  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId
    },
    include: {
      organization: true
    },
    orderBy: {
      createdAt: "asc"
    }
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
    "an"
  ]);

  const words = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2)
    .filter((word) => !stopWords.has(word));

  const uniqueWords = Array.from(new Set(words));

  const query = uniqueWords.slice(0, 12).join(" ");

  return query || question;
}

export async function askRagQuestion(userId: string, input: AskQuestionInput) {
  const membership = await getPrimaryMembership(userId);

  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({
        where: {
          id: input.conversationId,
          organizationId: membership.organizationId
        }
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
        title: createConversationTitle(input.question)
      }
    });
  }

  await prisma.message.create({
    data: {
      organizationId: membership.organizationId,
      conversationId: conversation.id,
      userId,
      role: "USER",
      content: input.question
    }
  });

  const retrievalQuery = buildRetrievalQuery(input.question);

  const searchResult = await searchKnowledgeChunks(userId, {
    query: retrievalQuery,
    limit: input.limit ?? 5
  });

  if (searchResult.chunks.length === 0) {
    const fallbackAnswer =
      "I could not find relevant information in your uploaded knowledge base. Please upload and ingest a related document first.";

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
          retrievalQuery
        }
      }
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
      retrievalQuery
    };
  }

  const sources = searchResult.chunks.map((chunk) => ({
    sourceId: chunk.source.id,
    sourceName: chunk.source.name,
    documentId: chunk.document.id,
    documentTitle: chunk.document.title,
    chunkId: chunk.id,
    chunkIndex: chunk.chunkIndex,
    score: chunk.score
  }));

  const aiResponse = await callAIRagChatService({
    question: input.question,
    context: searchResult.context,
    sources,
    metadata: {
      organizationId: membership.organizationId,
      conversationId: conversation.id,
      userId,
      retrievalQuery
    }
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
        originalQuestion: input.question,
        retrievalQuery
      }
    }
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
    retrievalQuery
  };
}



export async function listChatConversations(userId: string) {
  const membership = await getPrimaryMembership(userId);

  const conversations = await prisma.conversation.findMany({
    where: {
      organizationId: membership.organizationId,
      userId
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "desc"
        },
        take: 1
      },
      _count: {
        select: {
          messages: true
        }
      }
    },
    orderBy: {
      updatedAt: "desc"
    }
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
          createdAt: conversation.messages[0].createdAt
        }
      : null,
    createdAt: conversation.createdAt,
    updatedAt: conversation.updatedAt
  }));
}

export async function getChatConversationById(
  userId: string,
  conversationId: string
) {
  const membership = await getPrimaryMembership(userId);

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: membership.organizationId,
      userId
    },
    include: {
      messages: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
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
      createdAt: message.createdAt
    }))
  };
}

export async function deleteChatConversation(
  userId: string,
  conversationId: string
) {
  const membership = await getPrimaryMembership(userId);

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: conversationId,
      organizationId: membership.organizationId,
      userId
    }
  });

  if (!conversation) {
    const error = new Error("Conversation not found.");
    error.name = "NotFoundError";
    throw error;
  }

  await prisma.conversation.delete({
    where: {
      id: conversation.id
    }
  });

  return true;
}