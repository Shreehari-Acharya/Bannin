import "dotenv/config";
import express from "express";
import type { NextFunction, Request, Response } from "express";
import eventRouter from "./routes/eventRoute.js";
import generateRouter from "./routes/generateRoute.js";
import { env } from "./config/env.js";
import { createLogger } from "./utils/logger.js";

const logger = createLogger("server");
const serverApp = express();

serverApp.use(express.json());
serverApp.use("/events", eventRouter);
serverApp.use("/generate", generateRouter);

serverApp.get("/", (_req, res) => {
  res.send("Hello, bannin!");
});

serverApp.use((req, res) => {
  logger.warn("route not found", { method: req.method, path: req.originalUrl });
  res.status(404).json({ error: "Not found" });
});

serverApp.use((error: unknown, _req: Request, res: Response, _next: NextFunction) => {
  logger.error("unhandled error", { error: String(error) });
  res.status(500).json({ error: "Internal server error" });
});

serverApp.listen(env.port, () => {
  logger.info("started", { port: env.port });
});
