import Fastify from "fastify";
import fastifySwagger from "@fastify/swagger";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import sensible from "@fastify/sensible";
import { env } from "./env.ts";
import { prisma } from "./db.ts";
import { webhookRoutes } from "./routes/webhook.ts";
import { consultantRoutes } from "./routes/consultants.ts";
import { templateRoutes } from "./routes/templates.ts";
import fastifySwaggerUi from "@fastify/swagger-ui";

const app = Fastify().withTypeProvider<ZodTypeProvider>();

app.setValidatorCompiler(validatorCompiler);
app.setSerializerCompiler(serializerCompiler);

app.register(fastifySwagger, {
  openapi: {
    openapi: "3.0.0",
    info: {
      title: "Automation Jockey API",
      description:
        "API para distribuição automática de leads via WhatsApp com round-robin de consultores.",
      version: "1.0.0",
      contact: {
        name: "Automation Jockey",
      },
    },
    servers: [
      { url: `http://localhost:${env.PORT}`, description: "Desenvolvimento" },
    ],
    tags: [
      {
        name: "Consultores",
        description: "Gerenciamento de consultores e fila round-robin",
      },
      {
        name: "Templates",
        description: "Templates de mensagens com variáveis dinâmicas",
      },
      {
        name: "Webhooks",
        description: "Recebimento de eventos do UAZAPI",
      },
      {
        name: "Sistema",
        description: "Endpoints de infraestrutura",
      },
    ],
    externalDocs: {
      url: "https://doc.uazapi.com.br",
      description: "Documentação da API UAZAPI",
    },
  },
  transform: jsonSchemaTransform,
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
    displayRequestDuration: true,
    filter: true,
    persistAuthorization: true,
    tryItOutEnabled: false,
    tagsSorter: "alpha",
  },
  staticCSP: true,
  transformSpecificationClone: true,
});

await app.register(sensible);
await app.register(webhookRoutes);
await app.register(consultantRoutes);
await app.register(templateRoutes);

app.get("/health", {
  schema: {
    tags: ["Sistema"],
    summary: "Health check",
    response: {
      200: z.object({ ok: z.boolean() }),
    },
  },
  async handler() {
    return { ok: true };
  },
});

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
