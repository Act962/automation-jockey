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
import fastifySwaggerUi from "@fastify/swagger-ui";
import { webhookRoutes } from "./routes/webhook.ts";
import { consultantRoutes } from "./routes/consultants.ts";
import { templateRoutes } from "./routes/templates.ts";
import { leadRoutes } from "./routes/leads.ts";
import { interactionRoutes } from "./routes/interactions.ts";

export function buildApp({ port = 3000 }: { port?: number } = {}) {
  const app = Fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();

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
        contact: { name: "Automation Jockey" },
      },
      servers: [
        { url: `http://localhost:${port}`, description: "Desenvolvimento" },
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
        { name: "Leads", description: "Gerenciamento de leads capturados" },
        { name: "Interações", description: "Histórico de mensagens por lead" },
        { name: "Webhooks", description: "Recebimento de eventos do UAZAPI" },
        { name: "Sistema", description: "Endpoints de infraestrutura" },
      ],
      externalDocs: {
        url: "https://docs.uazapi.com/",
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

  app.register(sensible);
  app.register(webhookRoutes);
  app.register(consultantRoutes);
  app.register(templateRoutes);
  app.register(leadRoutes);
  app.register(interactionRoutes);

  app.get("/health", {
    schema: {
      tags: ["Sistema"],
      summary: "Health check",
      response: { 200: z.object({ ok: z.boolean() }) },
    },
    async handler() {
      return { ok: true };
    },
  });

  return app;
}
