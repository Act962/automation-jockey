import { timingSafeEqual } from "node:crypto";
import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { env } from "../env.ts";
import { processIncomingMessage } from "../services/leads.ts";

const messageSchema = z.object({
  EventType: z.string(),
  token: z.string().optional(),
  message: z
    .object({
      chatid: z.string(),
      fromMe: z.boolean().optional(),
      senderName: z.string().nullish(),
      messageid: z.string().optional(),
      messageType: z.string().optional(),
      text: z.string().nullish(),
      content: z
        .object({
          text: z.string().nullish(),
          caption: z.string().nullish(),
        })
        .nullish(),
    })
    .optional(),
  chat: z.object({ name: z.string().nullish() }).nullish(),
});

function checkSecret(provided: string | undefined): boolean {
  if (!provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(env.WEBHOOK_SECRET);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const TEXT_TYPES = new Set(["ExtendedTextMessage", "Conversation"]);

export const webhookRoutes: FastifyPluginAsync = async (app) => {
  app.post("/webhooks/uazapi", async (req, reply) => {
    const headerSecret = req.headers["x-webhook-secret"];
    const querySecret = (req.query as { secret?: string } | undefined)?.secret;
    const provided = typeof headerSecret === "string" ? headerSecret : querySecret;
    if (!checkSecret(provided)) {
      return reply.code(401).send({ error: "unauthorized" });
    }

    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      req.log.warn({ err: parsed.error.flatten() }, "invalid webhook payload");
      return reply.code(200).send({ ok: true, ignored: "invalid_payload" });
    }
    const json = parsed.data;

    if (json.EventType !== "messages") {
      return reply.code(200).send({ ok: true, ignored: json.EventType });
    }
    const m = json.message;
    if (!m || m.fromMe) {
      return reply.code(200).send({ ok: true, ignored: "fromMe_or_empty" });
    }
    if (m.messageType && !TEXT_TYPES.has(m.messageType)) {
      return reply.code(200).send({ ok: true, ignored: `type:${m.messageType}` });
    }
    if (!json.token) {
      req.log.warn("webhook without token; cannot reply via uazapi");
      return reply.code(200).send({ ok: true, ignored: "no_token" });
    }

    const phone = m.chatid.split("@")[0];
    if (!phone) {
      return reply.code(200).send({ ok: true, ignored: "no_phone" });
    }

    const body =
      m.text ?? m.content?.text ?? m.content?.caption ?? "";
    const name = m.senderName ?? json.chat?.name ?? null;

    const result = await processIncomingMessage({
      phone,
      name,
      body,
      messageId: m.messageid ?? null,
      token: json.token,
    });

    return reply.code(200).send({ ok: true, ...result });
  });
};
