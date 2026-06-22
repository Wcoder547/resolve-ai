import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import dotenv from "dotenv";

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

app.listen(PORT, () => {
  console.log(`Node API running on http://localhost:${PORT}`);
});