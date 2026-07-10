import type { Response } from "express";
import type { AuthenticatedRequest } from "../../types/express.js";
import { askAgenticQuestion } from "./chat.agent.service.js";
import { askQuestionSchema } from "./chat.validation.js";

export async function askAgenticQuestionController(
  req: AuthenticatedRequest,
  res: Response
) {
  const input = askQuestionSchema.parse(req.body);

  const result = await askAgenticQuestion(req.user.id, input);

  return res.json({
    success: true,
    message: "Agentic answer generated successfully.",
    data: result
  });
}