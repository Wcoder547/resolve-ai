import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  askQuestionController,
  deleteConversationController,
  getConversationController,
  listConversationsController
} from "./chat.controller.js";

import { requirePermission } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";

const router = Router();

router.use(requireAuth);

router.post("/ask", requirePermission(PERMISSIONS.CHAT_ASK), askQuestionController);

router.get("/conversations", requirePermission(PERMISSIONS.CHAT_READ), listConversationsController);

router.get(
  "/conversations/:conversationId",
  requirePermission(PERMISSIONS.CHAT_READ),
  getConversationController
);

router.delete(
  "/conversations/:conversationId",
  requirePermission(PERMISSIONS.CHAT_DELETE),
  deleteConversationController
);

export default router;