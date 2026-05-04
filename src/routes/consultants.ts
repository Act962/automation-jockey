import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().min(1),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  order: z.number().int().optional(),
  active: z.boolean().optional(),
});

export const consultantRoutes: FastifyPluginAsync = async (app) => {
  app.get("/consultants", async () => {
    return prisma.consultant.findMany({
      orderBy: [{ order: "asc" }, { id: "asc" }],
    });
  });

  app.post("/consultants", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const created = await prisma.consultant.create({ data: parsed.data });
    return reply.code(201).send(created);
  });

  app.patch<{ Params: { id: string } }>("/consultants/:id", async (req, reply) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    try {
      const updated = await prisma.consultant.update({
        where: { id: req.params.id },
        data: parsed.data,
      });
      return updated;
    } catch {
      return reply.code(404).send({ error: "not_found" });
    }
  });

  app.delete<{ Params: { id: string } }>("/consultants/:id", async (req, reply) => {
    try {
      await prisma.consultant.delete({ where: { id: req.params.id } });
      return reply.code(204).send();
    } catch {
      return reply.code(404).send({ error: "not_found" });
    }
  });
};
