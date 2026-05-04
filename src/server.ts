import Fastify from "fastify";
import sensible from "@fastify/sensible";
import { env } from "./env.ts";
import { prisma } from "./db.ts";
import { webhookRoutes } from "./routes/webhook.ts";
import { consultantRoutes } from "./routes/consultants.ts";
import { templateRoutes } from "./routes/templates.ts";

const app = Fastify({ logger: true });

await app.register(sensible);
await app.register(webhookRoutes);
await app.register(consultantRoutes);
await app.register(templateRoutes);

app.get("/health", async () => ({ ok: true }));

const shutdown = async (signal: string) => {
  app.log.info({ signal }, "shutting down");
  await app.close();
  await prisma.$disconnect();
  process.exit(0);
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

try {
  await app.listen({ port: env.PORT, host: "0.0.0.0" });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
