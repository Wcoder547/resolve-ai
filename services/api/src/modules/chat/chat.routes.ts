import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  askQuestionController,
  deleteConversationController,
  getConversationController,
  listConversationsController
} from "./chat.controller.js";

const router = Router();

router.post("/ask", requireAuth, askQuestionController);

router.get("/conversations", requireAuth, listConversationsController);

router.get(
  "/conversations/:conversationId",
  requireAuth,
  getConversationController
);

router.delete(
  "/conversations/:conversationId",
  requireAuth,
  deleteConversationController
);

export default router;