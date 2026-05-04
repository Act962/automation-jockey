import { z } from "zod";
import { prisma } from "../db.ts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const interactionSchema = z.object({
  id: z.string().describe("CUID gerado automaticamente"),
  leadId: z.string().describe("ID do lead"),
  direction: z
    .string()
    .describe("Direção da mensagem: 'in' (recebida) ou 'out' (enviada)"),
  body: z.string().describe("Conteúdo da mensagem"),
  messageId: z.string().nullable().describe("ID da mensagem no UAZAPI"),
  createdAt: z.date().describe("Data e hora da interação"),
});

const leadIdParam = z.object({
  leadId: z.string().describe("ID do lead"),
});

const interactionIdParam = z.object({
  leadId: z.string().describe("ID do lead"),
  id: z.string().describe("ID da interação"),
});

const createInteractionSchema = z.object({
  direction: z
    .enum(["in", "out"])
    .describe("Direção: 'in' para recebida, 'out' para enviada"),
  body: z.string().min(1).describe("Conteúdo da mensagem"),
  messageId: z
    .string()
    .optional()
    .describe("ID da mensagem no UAZAPI (opcional)"),
});

const errorSchema = z.object({ error: z.string() });

export const interactionRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get<{
    Params: z.infer<typeof leadIdParam>;
    Querystring: { page: number; limit: number };
  }>("/leads/:leadId/interactions", {
    schema: {
      tags: ["Interações"],
      summary: "Lista interações de um lead",
      params: leadIdParam,
      querystring: z.object({
        page: z.coerce
          .number()
          .int()
          .positive()
          .default(1)
          .describe("Página (padrão: 1)"),
        limit: z.coerce
          .number()
          .int()
          .positive()
          .max(100)
          .default(50)
          .describe("Itens por página (máx: 100)"),
      }),
      response: {
        200: z.object({
          data: z.array(interactionSchema),
          total: z.number().int(),
          page: z.number().int(),
          limit: z.number().int(),
        }),
        404: errorSchema,
      },
    },
    async handler(req, reply) {
      const { leadId } = req.params;
      const { page, limit } = req.query;

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true },
      });
      if (!lead) return reply.code(404).send({ error: "lead_not_found" });

      const skip = (page - 1) * limit;
      const [data, total] = await prisma.$transaction([
        prisma.interaction.findMany({
          where: { leadId },
          orderBy: { createdAt: "asc" },
          skip,
          take: limit,
        }),
        prisma.interaction.count({ where: { leadId } }),
      ]);

      return { data, total, page, limit };
    },
  });

  app.post<{
    Params: z.infer<typeof leadIdParam>;
    Body: z.infer<typeof createInteractionSchema>;
  }>("/leads/:leadId/interactions", {
    schema: {
      tags: ["Interações"],
      summary: "Registra uma interação manualmente",
      params: leadIdParam,
      body: createInteractionSchema,
      response: {
        201: interactionSchema,
        404: errorSchema,
      },
    },
    async handler(req, reply) {
      const { leadId } = req.params;

      const lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: { id: true },
      });
      if (!lead) return reply.code(404).send({ error: "lead_not_found" });

      const created = await prisma.interaction.create({
        data: {
          leadId,
          direction: req.body.direction,
          body: req.body.body,
          messageId: req.body.messageId ?? null,
        },
      });
      return reply.code(201).send(created);
    },
  });

  app.delete<{ Params: z.infer<typeof interactionIdParam> }>(
    "/leads/:leadId/interactions/:id",
    {
      schema: {
        tags: ["Interações"],
        summary: "Remove uma interação",
        params: interactionIdParam,
        response: {
          204: z.undefined().describe("No content"),
          404: errorSchema,
        },
      },
      async handler(req, reply) {
        try {
          await prisma.interaction.delete({
            where: { id: req.params.id, leadId: req.params.leadId },
          });
          return reply.code(204).send();
        } catch {
          return reply.code(404).send({ error: "not_found" });
        }
      },
    },
  );
};
