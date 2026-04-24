import { randomUUID } from "crypto";
import { createClient, type RedisClientType } from "redis";
import type { AgentInputItem, Session } from "@openai/agents";
import { env } from "../../config/env.js";
import { createLogger } from "../../utils/logger.js";

const logger = createLogger("agent.memory.redis");

export class RedisSession implements Session {
  private client: RedisClientType;
  private sessionId: string;
  private readonly ttlSeconds: number;
  private readonly keyPrefix: string;
  private readonly connectPromise: Promise<unknown>;

  constructor(
    sessionId?: string,
    redisUrl: string = env.redisUrl,
    ttlSeconds = 600,
    keyPrefix = "chat",
  ) {
    this.sessionId = sessionId ?? `session_${randomUUID()}`;
    this.ttlSeconds = ttlSeconds;
    this.keyPrefix = keyPrefix;
    this.client = createClient({ url: redisUrl });
    this.connectPromise = this.client.connect();
    this.connectPromise
      .then(() => {
        logger.debug("connected", { sessionId: this.sessionId });
      })
      .catch((error) => {
        logger.error("connect failed", {
          sessionId: this.sessionId,
          error: String(error),
        });
      });
  }

  private async ensureConnected(): Promise<void> {
    await this.connectPromise;
  }

  private key(): string {
    return `${this.keyPrefix}:${this.sessionId}`;
  }

  async getSessionId(): Promise<string> {
    return this.sessionId;
  }

  setSessionId(id: string): void {
    this.sessionId = id;
  }

  async getItems(): Promise<AgentInputItem[]> {
    await this.ensureConnected();
    const data = await this.client.get(this.key());
    const items: AgentInputItem[] = data ? JSON.parse(data) : [];

    return items;
  }

  async addItems(newItems: AgentInputItem[]): Promise<void> {
    await this.ensureConnected();
    if (newItems.length === 0) return;

    const existingData = await this.client.get(this.key());
    let items: AgentInputItem[] = existingData ? JSON.parse(existingData) : [];
    items = [...items, ...newItems];

    await this.client.set(this.key(), JSON.stringify(items), {
      EX: this.ttlSeconds,
    });
    logger.debug("items added", {
      sessionId: this.sessionId,
      appended: newItems.length,
      total: items.length,
    });
  }

  async popItem(): Promise<AgentInputItem | undefined> {
    await this.ensureConnected();
    const data = await this.client.get(this.key());
    if (!data) return undefined;

    let items: AgentInputItem[] = JSON.parse(data);
    const popped = items.pop();

    await this.client.set(this.key(), JSON.stringify(items), {
      EX: this.ttlSeconds,
    });
    return popped;
  }

  async clearSession(): Promise<void> {
    await this.ensureConnected();
    await this.client.del(this.key());
    logger.debug("session cleared", { sessionId: this.sessionId });
  }
}
