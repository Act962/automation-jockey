import { buildApp } from "./app.ts";
import { prisma } from "./db.ts";
import { env } from "./env.ts";

const app = buildApp({ port: env.PORT });

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
  console.log(`Server running at http://localhost:${env.PORT}`);
  console.log(`Docs running at http://localhost:${env.PORT}/docs`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
