import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { prisma } from "../db.ts";

const upsertSchema = z.object({ body: z.string().min(1) });

export const templateRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { key: string } }>("/templates/:key", async (req, reply) => {
    const tpl = await prisma.messageTemplate.findUnique({
      where: { key: req.params.key },
    });
    if (!tpl) return reply.code(404).send({ error: "not_found" });
    return tpl;
  });

  app.put<{ Params: { key: string } }>("/templates/:key", async (req, reply) => {
    const parsed = upsertSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const tpl = await prisma.messageTemplate.upsert({
      where: { key: req.params.key },
      update: { body: parsed.data.body },
      create: { key: req.params.key, body: parsed.data.body },
    });
    return tpl;
  });
};
