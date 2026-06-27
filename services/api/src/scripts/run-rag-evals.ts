import "dotenv/config";
import fs from "fs/promises";
import path from "path";
import { Prisma } from "@prisma/client";

import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { callAIRagChatService } from "../modules/chat/chat.ai-client.js";
import { searchKnowledgeChunks } from "../modules/knowledge/knowledge.service.js";

type EvalCase = {
  id: string;
  question: string;
  limit?: number;
  expectedSourceNames?: string[];
  expectedAnswerKeywords?: string[];
  expectedContextKeywords?: string[];
  requiresCitation?: boolean;
  expectedNeedsEscalation?: boolean;
  expectedNoContext?: boolean;
};

type EvalResult = {
  id: string;
  question: string;
  passed: boolean;
  score: number;
  checks: Record<string, boolean>;
  details: Record<string, unknown>;
};

function normalizeText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function includesKeyword(text: string, keyword: string) {
  return normalizeText(text).includes(normalizeText(keyword));
}

function keywordCoverage(text: string, keywords: string[]) {
  if (keywords.length === 0) {
    return {
      passed: true,
      matched: [],
      missing: []
    };
  }

  const matched = keywords.filter((keyword) => includesKeyword(text, keyword));
  const missing = keywords.filter((keyword) => !includesKeyword(text, keyword));

  return {
    passed: missing.length === 0,
    matched,
    missing
  };
}

function sourceCoverage(
  actualSourceNames: string[],
  expectedSourceNames: string[]
) {
  if (expectedSourceNames.length === 0) {
    return {
      passed: true,
      matched: [],
      missing: []
    };
  }

  const matched = expectedSourceNames.filter((expectedSource) =>
    actualSourceNames.some((actualSource) =>
      normalizeText(actualSource).includes(normalizeText(expectedSource))
    )
  );

  const missing = expectedSourceNames.filter(
    (expectedSource) => !matched.includes(expectedSource)
  );

  return {
    passed: missing.length === 0,
    matched,
    missing
  };
}

function calculateScore(checks: Record<string, boolean>) {
  const values = Object.values(checks);

  if (values.length === 0) {
    return 0;
  }

  const passed = values.filter(Boolean).length;

  return passed / values.length;
}

function trimContext(context: string) {
  if (context.length <= env.RAG_MAX_CONTEXT_CHARS) {
    return context;
  }

  return `${context.slice(0, env.RAG_MAX_CONTEXT_CHARS)}\n\n[Context trimmed for eval safety]`;
}

async function loadDataset() {
  const datasetPath = path.join(
    process.cwd(),
    "src",
    "evals",
    "rag-eval.dataset.json"
  );

  const raw = await fs.readFile(datasetPath, "utf-8");

  return JSON.parse(raw) as EvalCase[];
}

async function getEvalUser() {
  const user = await prisma.user.findUnique({
    where: {
      email: env.RAG_EVAL_USER_EMAIL
    }
  });

  if (!user) {
    throw new Error(
      `Eval user not found: ${env.RAG_EVAL_USER_EMAIL}. Create this user first or update RAG_EVAL_USER_EMAIL.`
    );
  }

  const membership = await prisma.organizationMember.findFirst({
    where: {
      userId: user.id
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  if (!membership) {
    throw new Error(`Eval user has no organization membership: ${user.email}`);
  }

  return {
    user,
    membership
  };
}

async function runSingleEval(input: {
  evalCase: EvalCase;
  userId: string;
  organizationId: string;
}): Promise<EvalResult> {
  const { evalCase, userId, organizationId } = input;

  const retrieval = await searchKnowledgeChunks(userId, {
    query: evalCase.question,
    limit: evalCase.limit ?? 5
  });

  const actualSourceNames = retrieval.chunks.map((chunk) => chunk.source.name);
  const retrievedContextText = retrieval.context || "";

  const sourceCheck = sourceCoverage(
    actualSourceNames,
    evalCase.expectedSourceNames || []
  );

  const contextKeywordCheck = keywordCoverage(
    retrievedContextText,
    evalCase.expectedContextKeywords || []
  );

  const noContextDetected = retrieval.chunks.length === 0;

  if (evalCase.expectedNoContext) {
    const checks = {
      noContextDetected
    };

    const score = calculateScore(checks);

    return {
      id: evalCase.id,
      question: evalCase.question,
      passed: score >= 1,
      score,
      checks,
      details: {
        retrievalMode: retrieval.retrievalMode,
        totalResults: retrieval.totalResults,
        sources: actualSourceNames
      }
    };
  }

  const sources = retrieval.chunks.map((chunk) => ({
    sourceId: chunk.source.id,
    sourceName: chunk.source.name,
    documentId: chunk.document.id,
    documentTitle: chunk.document.title,
    chunkId: chunk.id,
    chunkIndex: chunk.chunkIndex,
    score: chunk.score
  }));

  const aiResponse = await callAIRagChatService({
    question: evalCase.question,
    context: trimContext(retrieval.context),
    sources,
    metadata: {
      evalCaseId: evalCase.id,
      organizationId,
      retrievalMode: retrieval.retrievalMode,
      embedding: retrieval.embedding,
      totalRetrievedChunks: retrieval.chunks.length
    }
  });

  const answer = aiResponse.data.answer;
  const answerKeywordCheck = keywordCoverage(
    answer,
    evalCase.expectedAnswerKeywords || []
  );

  const citationCheck = evalCase.requiresCitation
    ? aiResponse.data.citations.length > 0 &&
      aiResponse.data.guardrails.hasCitations
    : true;

  const guardrailCheck =
    aiResponse.data.guardrails.approved && aiResponse.data.grounded;

  const escalationCheck =
    typeof evalCase.expectedNeedsEscalation === "boolean"
      ? aiResponse.data.needsEscalation === evalCase.expectedNeedsEscalation
      : true;

  const retrievalResultCheck = retrieval.chunks.length > 0;

  const checks = {
    retrievalReturnedChunks: retrievalResultCheck,
    expectedSourcesFound: sourceCheck.passed,
    expectedContextKeywordsFound: contextKeywordCheck.passed,
    expectedAnswerKeywordsFound: answerKeywordCheck.passed,
    citationsValid: citationCheck,
    guardrailsApproved: guardrailCheck,
    escalationExpectationMet: escalationCheck
  };

  const score = calculateScore(checks);

  return {
    id: evalCase.id,
    question: evalCase.question,
    passed: score >= env.RAG_EVAL_PASSING_SCORE,
    score,
    checks,
    details: {
      retrievalMode: retrieval.retrievalMode,
      embedding: retrieval.embedding,
      totalResults: retrieval.totalResults,
      topScore: retrieval.chunks[0]?.score ?? null,
      actualSourceNames,
      expectedSourceNames: evalCase.expectedSourceNames || [],
      sourceCheck,
      contextKeywordCheck,
      answerKeywordCheck,
      provider: aiResponse.data.provider,
      model: aiResponse.data.model,
      confidence: aiResponse.data.confidence,
      citationsCount: aiResponse.data.citations.length,
      needsEscalation: aiResponse.data.needsEscalation,
      guardrails: aiResponse.data.guardrails,
      promptVersion: aiResponse.data.promptVersion,
      answerPreview: answer.slice(0, 500)
    }
  };
}

function buildMarkdownReport(input: {
  createdAt: string;
  passingScore: number;
  total: number;
  passed: number;
  failed: number;
  averageScore: number;
  results: EvalResult[];
}) {
  const lines = [
    "# ResolveAI RAG Evaluation Report",
    "",
    `Generated: ${input.createdAt}`,
    `Passing score: ${input.passingScore}`,
    `Total cases: ${input.total}`,
    `Passed: ${input.passed}`,
    `Failed: ${input.failed}`,
    `Average score: ${input.averageScore.toFixed(3)}`,
    "",
    "## Results",
    ""
  ];

  for (const result of input.results) {
    lines.push(`### ${result.passed ? "✅" : "❌"} ${result.id}`);
    lines.push("");
    lines.push(`Question: ${result.question}`);
    lines.push("");
    lines.push(`Score: ${result.score.toFixed(3)}`);
    lines.push("");
    lines.push("Checks:");
    lines.push("");

    for (const [checkName, passed] of Object.entries(result.checks)) {
      lines.push(`- ${passed ? "✅" : "❌"} ${checkName}`);
    }

    lines.push("");
    lines.push("Details:");
    lines.push("");
    lines.push("```json");
    lines.push(JSON.stringify(result.details, null, 2));
    lines.push("```");
    lines.push("");
  }

  return lines.join("\n");
}

async function writeReports(results: EvalResult[]) {
  const outputDir = path.join(process.cwd(), env.RAG_EVAL_OUTPUT_DIR);
  await fs.mkdir(outputDir, { recursive: true });

  const createdAt = new Date().toISOString();
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;
  const averageScore =
    results.length === 0
      ? 0
      : results.reduce((sum, result) => sum + result.score, 0) / results.length;

  const report = {
    createdAt,
    passingScore: env.RAG_EVAL_PASSING_SCORE,
    total: results.length,
    passed,
    failed,
    averageScore,
    results
  };

  const timestamp = createdAt.replace(/[:.]/g, "-");

  const jsonPath = path.join(outputDir, `rag-eval-${timestamp}.json`);
  const markdownPath = path.join(outputDir, `rag-eval-${timestamp}.md`);

  await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
  await fs.writeFile(markdownPath, buildMarkdownReport(report));

  return {
    report,
    jsonPath,
    markdownPath
  };
}

async function main() {
  const dataset = await loadDataset();
  const { user, membership } = await getEvalUser();

  logger.info(
    {
      evalUserEmail: user.email,
      organizationId: membership.organizationId,
      cases: dataset.length
    },
    "Starting RAG evaluation"
  );

  const results: EvalResult[] = [];

  for (const evalCase of dataset) {
    try {
      logger.info(
        {
          evalCaseId: evalCase.id
        },
        "Running RAG eval case"
      );

      const result = await runSingleEval({
        evalCase,
        userId: user.id,
        organizationId: membership.organizationId
      });

      results.push(result);

      logger.info(
        {
          evalCaseId: result.id,
          passed: result.passed,
          score: result.score
        },
        "RAG eval case completed"
      );
    } catch (error) {
      const failedResult: EvalResult = {
        id: evalCase.id,
        question: evalCase.question,
        passed: false,
        score: 0,
        checks: {
          executionCompleted: false
        },
        details: {
          error: error instanceof Error ? error.message : "Unknown error"
        }
      };

      results.push(failedResult);

      logger.error(
        {
          evalCaseId: evalCase.id,
          error: {
            message: error instanceof Error ? error.message : "Unknown error"
          }
        },
        "RAG eval case failed"
      );
    }
  }

  const { report, jsonPath, markdownPath } = await writeReports(results);

  logger.info(
    {
      total: report.total,
      passed: report.passed,
      failed: report.failed,
      averageScore: report.averageScore,
      jsonPath,
      markdownPath
    },
    "RAG evaluation completed"
  );

  console.log("");
  console.log("RAG Evaluation Summary");
  console.log("----------------------");
  console.log(`Total: ${report.total}`);
  console.log(`Passed: ${report.passed}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Average score: ${report.averageScore.toFixed(3)}`);
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${markdownPath}`);
  console.log("");

  if (report.failed > 0 || report.averageScore < env.RAG_EVAL_PASSING_SCORE) {
    process.exit(1);
  }
}

main()
  .catch((error) => {
    logger.error(
      {
        error: {
          name: error instanceof Error ? error.name : "UnknownError",
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined
        }
      },
      "RAG evaluation script crashed"
    );

    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });