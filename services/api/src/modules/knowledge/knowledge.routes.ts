import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
import { requirePermission } from "../rbac/rbac.middleware.js";
import { PERMISSIONS } from "../rbac/rbac.permissions.js";
import {
  deleteKnowledgeSourceController,
  getKnowledgeSourceController,
  ingestKnowledgeSourceController,
  listKnowledgeSourcesController,
  searchKnowledgeController,
  uploadKnowledgeSourceController
} from "./knowledge.controller.js";
import { handleKnowledgeFileUpload } from "./knowledge.upload.js";

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  requirePermission(PERMISSIONS.KNOWLEDGE_READ),
  listKnowledgeSourcesController
);

router.get(
  "/:sourceId",
  requirePermission(PERMISSIONS.KNOWLEDGE_READ),
  getKnowledgeSourceController
);

router.post(
  "/upload",
  requirePermission(PERMISSIONS.KNOWLEDGE_UPLOAD),
  handleKnowledgeFileUpload,
  uploadKnowledgeSourceController
);

router.post(
  "/search",
  requirePermission(PERMISSIONS.KNOWLEDGE_READ),
  searchKnowledgeController
);

router.post(
  "/:sourceId/ingest",
  requirePermission(PERMISSIONS.KNOWLEDGE_INGEST),
  ingestKnowledgeSourceController
);

router.delete(
  "/:sourceId",
  requirePermission(PERMISSIONS.KNOWLEDGE_DELETE),
  deleteKnowledgeSourceController
);

export default router;