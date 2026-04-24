import OpenAI from "openai";
import { setDefaultOpenAIClient } from "@openai/agents";
import { env } from "../config/env.js";

console.log("Initializing OpenAI client with base URL:", env.openAiBaseUrl);

const openAiClient = new OpenAI({
  baseURL: env.openAiBaseUrl,
  apiKey: env.openAiApiKey,
});

export const DEFAULT_MODEL = "";

// Backward-compatible alias used by existing imports.
export const model = DEFAULT_MODEL;
export default DEFAULT_MODEL;

setDefaultOpenAIClient(openAiClient);


