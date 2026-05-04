import { z } from "zod";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
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
        .any()
        .nullish()
        .describe("Texto ou objeto {text, caption} dependendo do messageType"),
    })
    .optional(),
  chat: z.object({ name: z.string().nullish() }).nullish(),
});

const responseSchema = z.object({
  ok: z.boolean(),
  ignored: z.string().optional().describe("Motivo do evento ter sido ignorado"),
  status: z.string().optional().describe("Status do processamento: created | duplicate"),
});

const TEXT_TYPES = new Set(["ExtendedTextMessage", "Conversation"]);

export const webhookRoutes: FastifyPluginAsyncZod = async (app) => {
  app.post<{ Body: z.infer<typeof messageSchema> }>("/webhooks/uazapi", {
    schema: {
      tags: ["Webhooks"],
      summary: "Recebe eventos do UAZAPI",
      description:
        "Endpoint chamado pelo UAZAPI para cada evento de mensagem recebida. Processa apenas mensagens de texto de leads externos e distribui via round-robin.",
      body: messageSchema,
      response: {
        200: responseSchema,
      },
    },
    async handler(req, reply) {
      const json = req.body;

      if (json.EventType !== "messages") {
        return reply.code(200).send({ ok: true, ignored: json.EventType });
      }
      const message = json.message;
      if (!message || message.fromMe) {
        return reply.code(200).send({ ok: true, ignored: "fromMe_or_empty" });
      }
      if (message.messageType && !TEXT_TYPES.has(message.messageType)) {
        return reply
          .code(200)
          .send({ ok: true, ignored: `type:${message.messageType}` });
      }
      if (!json.token) {
        req.log.warn("webhook without token; cannot reply via uazapi");
        return reply.code(200).send({ ok: true, ignored: "no_token" });
      }

      const phone = message.chatid.split("@")[0];
      if (!phone) {
        return reply.code(200).send({ ok: true, ignored: "no_phone" });
      }

      const contentText =
        typeof message.content === "string"
          ? message.content
          : (message.content?.text ?? message.content?.caption);
      const body = message.text ?? contentText ?? "";
      const name = message.senderName ?? json.chat?.name ?? null;

      const result = await processIncomingMessage({
        phone,
        name,
        body,
        messageId: message.messageid ?? null,
        token: json.token,
      });

      return reply.code(200).send({ ok: true, ...result });
    },
  });
};
