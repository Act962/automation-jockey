import { z } from "zod";
import { prisma } from "../db.ts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const templateSchema = z.object({
  id: z.string().describe("CUID gerado automaticamente"),
  key: z.string().describe("Chave única do template, ex: greeting"),
  body: z.string().describe("Corpo do template com variáveis"),
  updatedAt: z.date().describe("Data da última atualização"),
});

const upsertSchema = z.object({
  body: z
    .string()
    .min(1)
    .describe(
      "Texto do template. Use {{leadName}}, {{consultantName}}, {{consultantPhone}} como variáveis.",
    ),
});

const keyParam = z.object({ key: z.string().describe("Chave do template") });

const errorSchema = z.object({ error: z.string() });

export const templateRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get<{ Params: z.infer<typeof keyParam> }>("/templates/:key", {
    schema: {
      tags: ["Templates"],
      summary: "Busca um template de mensagem",
      params: keyParam,
      response: {
        200: templateSchema,
        404: errorSchema,
      },
    },
    async handler(req, reply) {
      const tpl = await prisma.messageTemplate.findUnique({
        where: { key: req.params.key },
      });
      if (!tpl) return reply.code(404).send({ error: "not_found" });
      return tpl;
    },
  });

  app.put<{
    Params: z.infer<typeof keyParam>;
    Body: z.infer<typeof upsertSchema>;
  }>("/templates/:key", {
    schema: {
      tags: ["Templates"],
      summary: "Cria ou atualiza um template de mensagem",
      params: keyParam,
      body: upsertSchema,
      response: {
        200: templateSchema,
        400: errorSchema,
      },
    },
    async handler(req, reply) {
      const tpl = await prisma.messageTemplate.upsert({
        where: { key: req.params.key },
        update: { body: req.body.body },
        create: { key: req.params.key, body: req.body.body },
      });
      return tpl;
    },
  });
};
