import fs from "fs";
import path from "path";
import { env } from "../config/env.js";
import { logger } from "../lib/logger.js";
import { prisma } from "../lib/prisma.js";
import { askAgenticQuestion } from "../modules/chat/chat.agent.service.js";

type AgenticEvalCase = {
  id: string;
  question: string;
  limit?: number;
  expectedNoContext?: boolean;
  requiredAgents?: string[];
  expectedAnswerKeywords?: string[];
  expectedPendingToolNames?: string[];
  forbiddenExecutedToolNames?: string[];
  requiresCitation?: boolean;
  requiresGrounded?: boolean;
};

type EvalCheck = {
  name: string;
  passed: boolean;
  details?: unknown;
};

type EvalResult = {
  id: string;
  question: string;
  passed: boolean;
  score: number;
  checks: EvalCheck[];
  responseSummary: Record<string, unknown>;
};

function loadDataset() {
  const datasetPath = path.resolve(
    process.cwd(),
    "src/evals/agentic-eval.dataset.json"
  );

  return JSON.parse(fs.readFileSync(datasetPath, "utf8")) as AgenticEvalCase[];
}

function includesAllKeywords(text: string, keywords: string[]) {
  const normalizedText = text.toLowerCase();

  return keywords.every((keyword) =>
    normalizedText.includes(keyword.toLowerCase())
  );
}

function hasRequiredAgents(actualAgents: string[], requiredAgents: string[]) {
  return requiredAgents.every((agent) => actualAgents.includes(agent));
}

function getToolCalls(result: any) {
  return result.agentRun?.toolCalls || [];
}

function evaluateCase(testCase: AgenticEvalCase, result: any): EvalResult {
  const checks: EvalCheck[] = [];

  const agentRun = result.agentRun;
  const answer = String(result.answer || "");
  const toolCalls = getToolCalls(result);

  if (testCase.expectedNoContext) {
    checks.push({
      name: "expected_no_context_agent_run_null",
      passed: agentRun === null,
      details: {
        agentRun
      }
    });

    checks.push({
      name: "expected_no_context_not_grounded",
      passed: result.grounded === false,
      details: {
        grounded: result.grounded
      }
    });
  } else {
    checks.push({
      name: "agent_run_exists",
      passed: Boolean(agentRun),
      details: {
        agentRunId: agentRun?.id
      }
    });

    checks.push({
      name: "required_agents_ran",
      passed: hasRequiredAgents(
        agentRun?.agentsUsed || [],
        testCase.requiredAgents || []
      ),
      details: {
        actualAgents: agentRun?.agentsUsed || [],
        requiredAgents: testCase.requiredAgents || []
      }
    });

    checks.push({
      name: "steps_recorded",
      passed: (agentRun?.steps || []).length >=
        Math.min((testCase.requiredAgents || []).length, 5),
      details: {
        stepsCount: (agentRun?.steps || []).length
      }
    });
  }

  if (testCase.expectedAnswerKeywords?.length) {
    checks.push({
      name: "answer_contains_expected_keywords",
      passed: includesAllKeywords(answer, testCase.expectedAnswerKeywords),
      details: {
        keywords: testCase.expectedAnswerKeywords
      }
    });
  }

  if (testCase.requiresCitation) {
    checks.push({
      name: "citations_exist",
      passed: Array.isArray(result.citations) && result.citations.length > 0,
      details: {
        citationCount: result.citations?.length || 0
      }
    });
  }

  if (testCase.requiresGrounded) {
    checks.push({
      name: "answer_grounded",
      passed: result.grounded === true,
      details: {
        grounded: result.grounded
      }
    });
  }

  if (testCase.expectedPendingToolNames?.length) {
    for (const toolName of testCase.expectedPendingToolNames) {
      const matchingTool = toolCalls.find(
        (toolCall: any) => toolCall.toolName === toolName
      );

      checks.push({
        name: `tool_${toolName}_exists`,
        passed: Boolean(matchingTool),
        details: {
          toolCalls
        }
      });

      checks.push({
        name: `tool_${toolName}_pending_approval`,
        passed:
          matchingTool?.requiresApproval === true &&
          matchingTool?.approvalStatus === "PENDING" &&
          matchingTool?.status === "pending_approval",
        details: {
          matchingTool
        }
      });
    }
  }

  if (testCase.forbiddenExecutedToolNames?.length) {
    for (const toolName of testCase.forbiddenExecutedToolNames) {
      const executedTool = toolCalls.find(
        (toolCall: any) =>
          toolCall.toolName === toolName &&
          (toolCall.approvalStatus === "EXECUTED" ||
            toolCall.status === "completed")
      );

      checks.push({
        name: `tool_${toolName}_not_executed_without_approval`,
        passed: !executedTool,
        details: {
          executedTool: executedTool || null
        }
      });
    }
  }

  const passedChecks = checks.filter((check) => check.passed).length;
  const score = checks.length > 0 ? passedChecks / checks.length : 0;

  return {
    id: testCase.id,
    question: testCase.question,
    passed: checks.every((check) => check.passed),
    score,
    checks,
    responseSummary: {
      conversationId: result.conversationId,
      messageId: result.messageId,
      grounded: result.grounded,
      confidence: result.confidence,
      needsEscalation: result.needsEscalation,
      retrievalMode: result.retrievalMode,
      agentRunId: result.agentRun?.id || null,
      agentStatus: result.agentRun?.status || null,
      agentsUsed: result.agentRun?.agentsUsed || [],
      stepsCount: result.agentRun?.steps?.length || 0,
      toolCallsCount: result.agentRun?.toolCalls?.length || 0,
      citationsCount: result.citations?.length || 0
    }
  };
}

function writeReports(results: EvalResult[]) {
  const outputDir = path.resolve(process.cwd(), env.AGENTIC_EVAL_OUTPUT_DIR);

  fs.mkdirSync(outputDir, {
    recursive: true
  });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

  const total = results.length;
  const passed = results.filter((result) => result.passed).length;
  const failed = total - passed;
  const averageScore =
    total > 0
      ? results.reduce((sum, result) => sum + result.score, 0) / total
      : 0;

  const report = {
    createdAt: new Date().toISOString(),
    passingScore: env.AGENTIC_EVAL_PASSING_SCORE,
    total,
    passed,
    failed,
    averageScore,
    results
  };

  const jsonPath = path.join(outputDir, `agentic-eval-${timestamp}.json`);
  const mdPath = path.join(outputDir, `agentic-eval-${timestamp}.md`);

  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const markdown = [
    "# Agentic Evaluation Report",
    "",
    `Created At: ${report.createdAt}`,
    "",
    `Passing Score: ${report.passingScore}`,
    `Total: ${total}`,
    `Passed: ${passed}`,
    `Failed: ${failed}`,
    `Average Score: ${averageScore.toFixed(3)}`,
    "",
    "## Results",
    "",
    ...results.flatMap((result) => [
      `### ${result.id}`,
      "",
      `Question: ${result.question}`,
      "",
      `Passed: ${result.passed ? "Yes" : "No"}`,
      `Score: ${result.score.toFixed(3)}`,
      "",
      "Checks:",
      "",
      ...result.checks.map(
        (check) => `- ${check.passed ? "✅" : "❌"} ${check.name}`
      ),
      "",
      "Summary:",
      "",
      "```json",
      JSON.stringify(result.responseSummary, null, 2),
      "```",
      ""
    ])
  ].join("\n");

  fs.writeFileSync(mdPath, markdown);

  return {
    report,
    jsonPath,
    mdPath
  };
}

async function main() {
  const dataset = loadDataset();

  const user = await prisma.user.findUnique({
    where: {
      email: env.AGENTIC_EVAL_USER_EMAIL
    }
  });

  if (!user) {
    throw new Error(
      `Agentic eval user not found: ${env.AGENTIC_EVAL_USER_EMAIL}`
    );
  }

  const results: EvalResult[] = [];

  for (const testCase of dataset) {
    logger.info(
      {
        evalCaseId: testCase.id
      },
      "Running agentic eval case"
    );

    const response = await askAgenticQuestion(user.id, {
      question: testCase.question,
      limit: testCase.limit || 5
    });

    const result = evaluateCase(testCase, response);

    results.push(result);

    logger.info(
      {
        evalCaseId: testCase.id,
        passed: result.passed,
        score: result.score
      },
      "Agentic eval case completed"
    );
  }

  const { report, jsonPath, mdPath } = writeReports(results);

  console.log("");
  console.log("Agentic Evaluation Summary");
  console.log("--------------------------");
  console.log(`Total: ${report.total}`);
  console.log(`Passed: ${report.passed}`);
  console.log(`Failed: ${report.failed}`);
  console.log(`Average score: ${report.averageScore.toFixed(3)}`);
  console.log(`JSON report: ${jsonPath}`);
  console.log(`Markdown report: ${mdPath}`);

  if (
    report.failed > 0 ||
    report.averageScore < env.AGENTIC_EVAL_PASSING_SCORE
  ) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });