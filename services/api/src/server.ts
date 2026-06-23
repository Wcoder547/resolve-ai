
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";
import authRoutes from "./modules/auth/auth.routes";
import organizationRoutes from "./modules/organizations/organization.routes.js";
import knowledgeRoutes from "./modules/knowledge/knowledge.routes.js";
import chatRoutes from "./modules/chat/chat.routes.js";

dotenv.config();


const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;

app.get("/", (_req, res) => {
  res.json({
    service: "ResolveAI API Gateway",
    status: "running",
    version: "1.0.0"
  });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "node-api"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/organizations", organizationRoutes);
app.use("/api/knowledge", knowledgeRoutes);
app.use("/api/chat", chatRoutes);

app.listen(PORT, () => {
  console.log(`Node API running on http://localhost:${PORT}`);
});