import { Prisma } from "@prisma/client";
import { env } from "../../config/env.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { searchKnowledgeChunks } from "../knowledge/knowledge.service.js";
import {
  assertOrganizationAiUsageAllowed,
  recordAiUsage,
} from "../usage/usage.service.js";
import { callAIAgenticResolveService } from "./chat.agent-client.js";
import {
  completeAgentRunRecord,
  createAgentRunRecord,
  failAgentRunRecord,
} from "./chat.agent-run.service.js";
import {
  callAIQuestionRewriteService,
  type ChatHistoryMessage,
} from "./chat.context-client.js";
import type { AskQuestionInput } from "./chat.validation.js";

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

function createDisabledError() {
  const error = new Error("Agentic chat is currently disabled.");
  error.name = "ForbiddenError";
  return error;
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

  return `${context.slice(0, env.RAG_MAX_CONTEXT_CHARS)}\n\n[Context trimmed for agentic runtime safety]`;
}

function trimChatHistoryByChars(messages: ChatHistoryMessage[]) {
  let totalChars = 0;
  const selected: ChatHistoryMessage[] = [];

  for (let index = messages.length - 1; index >= 0; index--) {
    const message = messages[index];
    const contentLength = message.content.length;

    if (totalChars + contentLength > env.CHAT_HISTORY_MAX_CHARS) {
      break;
    }

    totalChars += contentLength;
    selected.unshift(message);
  }

  return selected;
}

async function getConversationHistory(input: {
  organizationId: string;
  conversationId: string;
}) {
  if (env.CHAT_HISTORY_LIMIT <= 0) {
    return [];
  }

  const messages = await prisma.message.findMany({
    where: {
      organizationId: input.organizationId,
      conversationId: input.conversationId,
    },
    select: {
      role: true,
      content: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: env.CHAT_HISTORY_LIMIT,
  });

  const chronologicalMessages = messages.reverse().map((message) => ({
    role: message.role,
    content: message.content,
    createdAt: message.createdAt.toISOString(),
  }));

  return trimChatHistoryByChars(chronologicalMessages);
}

async function contextualizeQuestion(input: {
  question: string;
  conversationHistory: ChatHistoryMessage[];
  organizationId: string;
  conversationId: string;
  userId: string;
}) {
  if (!env.FOLLOWUP_REWRITE_ENABLED || input.conversationHistory.length === 0) {
    return {
      standaloneQuestion: input.question,
      wasFollowUp: false,
      confidence: "high",
      provider: "none",
      model: "none",
      promptVersion: "disabled",
      fallbackUsed: false,
      providerErrors: [] as string[],
      usage: null,
    };
  }

  try {
    const response = await callAIQuestionRewriteService({
      question: input.question,
      conversationHistory: input.conversationHistory,
      metadata: {
        organizationId: input.organizationId,
        conversationId: input.conversationId,
        userId: input.userId,
        mode: "agentic_chat",
      },
    });

    return response.data;
  } catch (error) {
    logger.warn(
      {
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message:
            error instanceof Error
              ? error.message
              : "Unknown question rewrite error",
        },
        conversationId: input.conversationId,
      },
      "Agentic question rewrite failed. Falling back to original question.",
    );

    return {
      standaloneQuestion: input.question,
      wasFollowUp: false,
      confidence: "low",
      provider: "fallback",
      model: "none",
      promptVersion: "fallback",
      fallbackUsed: true,
      providerErrors: [
        error instanceof Error
          ? error.message
          : "Unknown question rewrite error",
      ],
      usage: null,
    };
  }
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
    searchResult: fallbackResult,
  };
}

function createNoContextAnswer() {
  return [
    "I could not find relevant information in your uploaded knowledge base.",
    "",
    "Please upload and ingest a related document first, or ask a question that matches the existing knowledge base.",
  ].join("\n");
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

export async function askAgenticQuestion(
  userId: string,
  input: AskQuestionInput,
) {
  if (!env.AGENTIC_CHAT_ENABLED) {
    throw createDisabledError();
  }

  const membership = await getPrimaryMembership(userId);

  await assertOrganizationAiUsageAllowed(membership.organizationId);

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
        metadata: {
          mode: "agentic",
        } as Prisma.InputJsonValue,
      },
    });
  }

  const conversationHistory = await getConversationHistory({
    organizationId: membership.organizationId,
    conversationId: conversation.id,
  });

  const questionContext = await contextualizeQuestion({
    question: input.question,
    conversationHistory,
    organizationId: membership.organizationId,
    conversationId: conversation.id,
    userId,
  });

  const userMessage = await prisma.message.create({
    data: {
      organizationId: membership.organizationId,
      conversationId: conversation.id,
      userId,
      role: "USER",
      content: input.question,
      metadata: {
        mode: "agentic",
        standaloneQuestion: questionContext.standaloneQuestion,
        wasFollowUp: questionContext.wasFollowUp,
        questionRewrite: questionContext,
      } as Prisma.InputJsonValue,
    },
  });

  const limit = input.limit ?? 5;

  const { retrievalQuery, searchResult } = await retrieveRelevantChunks(
    userId,
    questionContext.standaloneQuestion,
    limit,
  );

  const topScore = searchResult.chunks[0]?.score ?? 0;

  const minimumRetrievalScore = env.HYBRID_SEARCH_ENABLED
    ? env.RAG_MIN_HYBRID_SCORE
    : env.RAG_MIN_RELEVANCE_SCORE;

  if (searchResult.chunks.length === 0 || topScore < minimumRetrievalScore) {
    const fallbackAnswer = createNoContextAnswer();

    const assistantMessage = await prisma.message.create({
      data: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: fallbackAnswer,
        sources: [],
        metadata: {
          mode: "agentic",
          grounded: false,
          reason: "NO_RELEVANT_CHUNKS_FOUND",
          originalQuestion: input.question,
          standaloneQuestion: questionContext.standaloneQuestion,
          wasFollowUp: questionContext.wasFollowUp,
          questionRewrite: questionContext,
          conversationHistoryMessages: conversationHistory.length,
          retrievalQuery,
          retrievalMode: searchResult.retrievalMode,
          embedding: searchResult.embedding,
          topScore,
        } as Prisma.InputJsonValue,
      },
    });

    await writeChatAuditLog({
      userId,
      organizationId: membership.organizationId,
      action: "AGENTIC_CHAT_NO_RELEVANT_CONTEXT",
      metadata: {
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        question: input.question,
        standaloneQuestion: questionContext.standaloneQuestion,
        retrievalQuery,
        topScore,
      },
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer: fallbackAnswer,
      sources: [],
      citations: [],
      retrievedChunks: [],
      grounded: false,
      confidence: "low",
      needsEscalation: false,
      escalationReason: null,
      agentRun: null,
      originalQuestion: input.question,
      standaloneQuestion: questionContext.standaloneQuestion,
      wasFollowUp: questionContext.wasFollowUp,
      questionRewrite: questionContext,
      conversationHistoryMessages: conversationHistory.length,
      retrievalQuery,
      retrievalMode: searchResult.retrievalMode,
      embedding: searchResult.embedding,
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

  const agentRun = await createAgentRunRecord({
    organizationId: membership.organizationId,
    userId,
    conversationId: conversation.id,
    messageId: userMessage.id,
    question: input.question,
    standaloneQuestion: questionContext.standaloneQuestion,
    retrievalQuery,
    retrievalMode: searchResult.retrievalMode,
    embedding: searchResult.embedding,
  });

  try {
    const agentResponse = await callAIAgenticResolveService({
      question: input.question,
      standaloneQuestion: questionContext.standaloneQuestion,
      context: trimContext(searchResult.context),
      sources,
      conversationHistory,
      metadata: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        userId,
        userMessageId: userMessage.id,
        localAgentRunId: agentRun.id,
        originalQuestion: input.question,
        standaloneQuestion: questionContext.standaloneQuestion,
        wasFollowUp: questionContext.wasFollowUp,
        questionRewrite: questionContext,
        conversationHistoryMessages: conversationHistory.length,
        retrievalQuery,
        retrievalMode: searchResult.retrievalMode,
        embedding: searchResult.embedding,
        totalRetrievedChunks: searchResult.chunks.length,
        topScore,
      },
    });

    const assistantMessage = await prisma.message.create({
      data: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: agentResponse.data.answer,
        sources: sources as Prisma.InputJsonValue,
        metadata: {
          mode: "agentic",
          localAgentRunId: agentRun.id,
          externalAgentRunId: agentResponse.data.agentRunId,
          agentStatus: agentResponse.data.status,
          agentsUsed: agentResponse.data.agentsUsed,
          stepsCount: agentResponse.data.steps.length,
          triage: agentResponse.data.triage,
          retrievalReview: agentResponse.data.retrievalReview,
          diagnostic: agentResponse.data.diagnostic,
          resolution: agentResponse.data.resolution,
          qa: agentResponse.data.qa,
          citations: agentResponse.data.citations,
          model: agentResponse.data.model,
          provider: agentResponse.data.provider,
          grounded: agentResponse.data.grounded,
          confidence: agentResponse.data.confidence,
          needsEscalation: agentResponse.data.needsEscalation,
          escalationReason: agentResponse.data.escalationReason,
          promptVersion: agentResponse.data.promptVersion,
          fallbackUsed: agentResponse.data.fallbackUsed || false,
          providerErrors: agentResponse.data.providerErrors || [],
          originalQuestion: input.question,
          standaloneQuestion: questionContext.standaloneQuestion,
          wasFollowUp: questionContext.wasFollowUp,
          questionRewrite: questionContext,
          conversationHistoryMessages: conversationHistory.length,
          retrievalQuery,
          retrievalMode: searchResult.retrievalMode,
          embedding: searchResult.embedding,
          totalRetrievedChunks: searchResult.chunks.length,
          topScore,
        } as Prisma.InputJsonValue,
      },
    });

    await completeAgentRunRecord({
      agentRunId: agentRun.id,
      response: agentResponse,
    });

    if (questionContext.provider !== "none" && questionContext.usage) {
      await recordAiUsage({
        organizationId: membership.organizationId,
        userId,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        operation: "agentic_question_rewrite",
        provider: questionContext.provider,
        model: questionContext.model,
        promptTokens: questionContext.usage.promptTokens,
        completionTokens: questionContext.usage.completionTokens,
        totalTokens: questionContext.usage.totalTokens,
        isEstimated: questionContext.usage.isEstimated,
        metadata: {
          localAgentRunId: agentRun.id,
          originalQuestion: input.question,
          standaloneQuestion: questionContext.standaloneQuestion,
          wasFollowUp: questionContext.wasFollowUp,
        },
      });
    }

    if (searchResult.embedding?.usage) {
      await recordAiUsage({
        organizationId: membership.organizationId,
        userId,
        conversationId: conversation.id,
        messageId: assistantMessage.id,
        operation: "agentic_embedding_query",
        provider: searchResult.embedding.provider,
        model: searchResult.embedding.model,
        promptTokens: searchResult.embedding.usage.promptTokens,
        completionTokens: searchResult.embedding.usage.completionTokens,
        totalTokens: searchResult.embedding.usage.totalTokens,
        isEstimated: searchResult.embedding.usage.isEstimated,
        metadata: {
          localAgentRunId: agentRun.id,
          originalQuestion: input.question,
          standaloneQuestion: questionContext.standaloneQuestion,
          retrievalQuery,
          retrievalMode: searchResult.retrievalMode,
        },
      });
    }

    await writeChatAuditLog({
      userId,
      organizationId: membership.organizationId,
      action: "AGENTIC_CHAT_ANSWER_GENERATED",
      metadata: {
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        localAgentRunId: agentRun.id,
        externalAgentRunId: agentResponse.data.agentRunId,
        status: agentResponse.data.status,
        agentsUsed: agentResponse.data.agentsUsed,
        stepsCount: agentResponse.data.steps.length,
        provider: agentResponse.data.provider,
        model: agentResponse.data.model,
        grounded: agentResponse.data.grounded,
        confidence: agentResponse.data.confidence,
        citationCount: agentResponse.data.citations.length,
        needsEscalation: agentResponse.data.needsEscalation,
        promptVersion: agentResponse.data.promptVersion,
        fallbackUsed: agentResponse.data.fallbackUsed || false,
        originalQuestion: input.question,
        standaloneQuestion: questionContext.standaloneQuestion,
        wasFollowUp: questionContext.wasFollowUp,
        retrievalQuery,
        retrievalMode: searchResult.retrievalMode,
        totalRetrievedChunks: searchResult.chunks.length,
        topScore,
      },
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer: agentResponse.data.answer,
      sources,
      citations: agentResponse.data.citations,
      retrievedChunks: searchResult.chunks,
      grounded: agentResponse.data.grounded,
      confidence: agentResponse.data.confidence,
      needsEscalation: agentResponse.data.needsEscalation,
      escalationReason: agentResponse.data.escalationReason,
      agentRun: {
        id: agentRun.id,
        externalRunId: agentResponse.data.agentRunId,
        status: agentResponse.data.status,
        agentsUsed: agentResponse.data.agentsUsed,
        steps: agentResponse.data.steps,
        toolCalls: agentResponse.data.toolCalls,
        triage: agentResponse.data.triage,
        retrievalReview: agentResponse.data.retrievalReview,
        diagnostic: agentResponse.data.diagnostic,
        resolution: agentResponse.data.resolution,
        qa: agentResponse.data.qa,
        provider: agentResponse.data.provider,
        model: agentResponse.data.model,
        promptVersion: agentResponse.data.promptVersion,
        fallbackUsed: agentResponse.data.fallbackUsed || false,
        providerErrors: agentResponse.data.providerErrors || [],
      },
      originalQuestion: input.question,
      standaloneQuestion: questionContext.standaloneQuestion,
      wasFollowUp: questionContext.wasFollowUp,
      questionRewrite: questionContext,
      conversationHistoryMessages: conversationHistory.length,
      retrievalQuery,
      retrievalMode: searchResult.retrievalMode,
      embedding: searchResult.embedding,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown agentic chat error.";

    await failAgentRunRecord({
      agentRunId: agentRun.id,
      error: errorMessage,
    }).catch(() => null);

    const fallbackAnswer = [
      "I found relevant knowledge base context, but the agentic AI runtime failed while generating the resolution.",
      "",
      "Please try again. If the issue continues, check the AI service logs and provider configuration.",
    ].join("\n");

    const assistantMessage = await prisma.message.create({
      data: {
        organizationId: membership.organizationId,
        conversationId: conversation.id,
        role: "ASSISTANT",
        content: fallbackAnswer,
        sources: sources as Prisma.InputJsonValue,
        metadata: {
          mode: "agentic",
          localAgentRunId: agentRun.id,
          grounded: false,
          toolCalls: agentResponse.data.toolCalls,
          toolCallsCount: agentResponse.data.toolCalls.length,
          reason: "AGENTIC_GENERATION_FAILED",
          error: errorMessage,
          originalQuestion: input.question,
          standaloneQuestion: questionContext.standaloneQuestion,
          wasFollowUp: questionContext.wasFollowUp,
          questionRewrite: questionContext,
          conversationHistoryMessages: conversationHistory.length,
          retrievalQuery,
          retrievalMode: searchResult.retrievalMode,
          embedding: searchResult.embedding,
          totalRetrievedChunks: searchResult.chunks.length,
          topScore,
        } as Prisma.InputJsonValue,
      },
    });

    await writeChatAuditLog({
      userId,
      organizationId: membership.organizationId,
      action: "AGENTIC_CHAT_GENERATION_FAILED",
      metadata: {
        toolCallsCount: agentResponse.data.toolCalls.length,
        toolNames: agentResponse.data.toolCalls.map(
          (toolCall) => toolCall.toolName,
        ),
        conversationId: conversation.id,
        userMessageId: userMessage.id,
        assistantMessageId: assistantMessage.id,
        localAgentRunId: agentRun.id,
        error: errorMessage,
        retrievalQuery,
        retrievalMode: searchResult.retrievalMode,
        totalRetrievedChunks: searchResult.chunks.length,
        topScore,
      },
    });

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      answer: fallbackAnswer,
      sources,
      citations: [],
      retrievedChunks: searchResult.chunks,
      grounded: false,
      confidence: "low",
      needsEscalation: true,
      escalationReason: "Agentic runtime failed.",
      agentRun: {
        id: agentRun.id,
        status: "failed",
        error: errorMessage,
      },
      originalQuestion: input.question,
      standaloneQuestion: questionContext.standaloneQuestion,
      wasFollowUp: questionContext.wasFollowUp,
      questionRewrite: questionContext,
      conversationHistoryMessages: conversationHistory.length,
      retrievalQuery,
      retrievalMode: searchResult.retrievalMode,
      embedding: searchResult.embedding,
    };
  }
}
