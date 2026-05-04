import { z } from "zod";
import { prisma } from "../db.ts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const leadSchema = z.object({
  id: z.string().describe("CUID gerado automaticamente"),
  phone: z.string().describe("Número de WhatsApp do lead"),
  name: z.string().nullable().describe("Nome do lead"),
  consultantId: z.string().nullable().describe("ID do consultor responsável"),
  createdAt: z.date().describe("Data de criação"),
});

const leadWithConsultantSchema = leadSchema.extend({
  consultant: z
    .object({
      id: z.string(),
      name: z.string(),
      phone: z.string(),
    })
    .nullable()
    .describe("Consultor responsável"),
});

const updateLeadSchema = z.object({
  name: z.string().min(1).optional().describe("Nome do lead"),
  consultantId: z
    .string()
    .nullable()
    .optional()
    .describe("Reatribuir a outro consultor (null = sem consultor)"),
});

const idParam = z.object({ id: z.string().describe("ID do lead") });

const errorSchema = z.object({ error: z.string() });

export const leadRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/leads", {
    schema: {
      tags: ["Leads"],
      summary: "Lista todos os leads",
      querystring: z.object({
        consultantId: z
          .string()
          .optional()
          .describe("Filtrar por consultor"),
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
          .default(20)
          .describe("Itens por página (máx: 100)"),
      }),
      response: {
        200: z.object({
          data: z.array(leadWithConsultantSchema),
          total: z.number().int().describe("Total de registros"),
          page: z.number().int(),
          limit: z.number().int(),
        }),
      },
    },
    async handler(req) {
      const { consultantId, page, limit } = req.query;
      const where = consultantId ? { consultantId } : {};
      const skip = (page - 1) * limit;

      const [data, total] = await prisma.$transaction([
        prisma.lead.findMany({
          where,
          include: { consultant: { select: { id: true, name: true, phone: true } } },
          orderBy: { createdAt: "desc" },
          skip,
          take: limit,
        }),
        prisma.lead.count({ where }),
      ]);

      return { data, total, page, limit };
    },
  });

  app.get<{ Params: z.infer<typeof idParam> }>("/leads/:id", {
    schema: {
      tags: ["Leads"],
      summary: "Busca um lead pelo ID",
      params: idParam,
      response: {
        200: leadWithConsultantSchema,
        404: errorSchema,
      },
    },
    async handler(req, reply) {
      const lead = await prisma.lead.findUnique({
        where: { id: req.params.id },
        include: { consultant: { select: { id: true, name: true, phone: true } } },
      });
      if (!lead) return reply.code(404).send({ error: "not_found" });
      return lead;
    },
  });

  app.patch<{ Params: z.infer<typeof idParam>; Body: z.infer<typeof updateLeadSchema> }>(
    "/leads/:id",
    {
      schema: {
        tags: ["Leads"],
        summary: "Atualiza nome ou consultor do lead",
        params: idParam,
        body: updateLeadSchema,
        response: {
          200: leadWithConsultantSchema,
          404: errorSchema,
        },
      },
      async handler(req, reply) {
        try {
          const updated = await prisma.lead.update({
            where: { id: req.params.id },
            data: req.body,
            include: { consultant: { select: { id: true, name: true, phone: true } } },
          });
          return updated;
        } catch {
          return reply.code(404).send({ error: "not_found" });
        }
      },
    },
  );

  app.delete<{ Params: z.infer<typeof idParam> }>("/leads/:id", {
    schema: {
      tags: ["Leads"],
      summary: "Remove um lead e suas interações",
      params: idParam,
      response: {
        204: z.undefined().describe("No content"),
        404: errorSchema,
      },
    },
    async handler(req, reply) {
      try {
        await prisma.lead.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  });
};
