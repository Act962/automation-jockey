import { z } from "zod";
import { prisma } from "../db.ts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

const consultantSchema = z.object({
  id: z.string().describe("CUID gerado automaticamente"),
  name: z.string().describe("Nome do consultor"),
  phone: z.string().describe("Número de WhatsApp no formato DDDnúmero"),
  active: z
    .boolean()
    .describe("Se false, o consultor é ignorado no round-robin"),
  order: z.number().int().describe("Posição na fila (menor = primeiro)"),
  createdAt: z.date().describe("Data de criação"),
});

const createSchema = z.object({
  name: z.string().min(1).describe("Nome do consultor"),
  phone: z
    .string()
    .min(1)
    .describe("WhatsApp: só dígitos, ex: 5511999999999"),
  order: z.number().int().optional().describe("Posição na fila; padrão 0"),
  active: z.boolean().optional().describe("Ativo no round-robin; padrão true"),
});

const updateSchema = z.object({
  name: z.string().min(1).optional().describe("Nome do consultor"),
  phone: z.string().min(1).optional().describe("WhatsApp: só dígitos"),
  order: z.number().int().optional().describe("Posição na fila"),
  active: z.boolean().optional().describe("Ativo no round-robin"),
});

const idParam = z.object({ id: z.string().describe("ID do consultor") });

const errorSchema = z.object({ error: z.string() });

export const consultantRoutes: FastifyPluginAsyncZod = async (app) => {
  app.get("/consultants", {
    schema: {
      tags: ["Consultores"],
      summary: "Lista todos os consultores",
      response: {
        200: z.array(consultantSchema),
      },
    },
    async handler() {
      return prisma.consultant.findMany({
        orderBy: [{ order: "asc" }, { id: "asc" }],
      });
    },
  });

  app.post<{ Body: z.infer<typeof createSchema> }>("/consultants", {
    schema: {
      tags: ["Consultores"],
      summary: "Cria um consultor",
      body: createSchema,
      response: {
        201: consultantSchema,
        400: errorSchema,
      },
    },
    async handler(req, reply) {
      const created = await prisma.consultant.create({ data: req.body });
      return reply.code(201).send(created);
    },
  });

  app.patch<{
    Params: z.infer<typeof idParam>;
    Body: z.infer<typeof updateSchema>;
  }>("/consultants/:id", {
    schema: {
      tags: ["Consultores"],
      summary: "Atualiza um consultor",
      params: idParam,
      body: updateSchema,
      response: {
        200: consultantSchema,
        404: errorSchema,
      },
    },
    async handler(req, reply) {
      try {
        const updated = await prisma.consultant.update({
          where: { id: req.params.id },
          data: req.body,
        });
        return updated;
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  });

  app.delete<{ Params: z.infer<typeof idParam> }>("/consultants/:id", {
    schema: {
      tags: ["Consultores"],
      summary: "Remove um consultor",
      params: idParam,
      response: {
        204: z.undefined().describe("No content"),
        404: errorSchema,
      },
    },
    async handler(req, reply) {
      try {
        await prisma.consultant.delete({ where: { id: req.params.id } });
        return reply.code(204).send();
      } catch {
        return reply.code(404).send({ error: "not_found" });
      }
    },
  });
};
