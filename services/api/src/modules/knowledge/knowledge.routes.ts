import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware.js";
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

router.get("/sources", requireAuth, listKnowledgeSourcesController);

router.get(
  "/sources/:sourceId",
  requireAuth,
  getKnowledgeSourceController
);

router.post("/search", requireAuth, searchKnowledgeController);

router.post(
  "/upload",
  requireAuth,
  handleKnowledgeFileUpload,
  uploadKnowledgeSourceController
);
 router.post(
  "/sources/:sourceId/ingest",
  requireAuth,
  ingestKnowledgeSourceController
);


router.delete(
  "/sources/:sourceId",
  requireAuth,
  deleteKnowledgeSourceController
);



export default router;