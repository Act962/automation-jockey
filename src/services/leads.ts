import { prisma } from "../db.ts";
import { sendText } from "../http/uazapi.ts";
import { assignLeadRoundRobin } from "./round-robin.ts";
import { render } from "./template.ts";

type Input = {
  phone: string;
  name: string | null;
  body: string;
  messageId: string | null;
  token: string;
};

type Result =
  | { status: "duplicate" }
  | { status: "created"; consultant: { id: string; name: string; phone: string } | null };

export async function processIncomingMessage(input: Input): Promise<Result> {
  const { phone, name, body, messageId, token } = input;

  const existing = await prisma.lead.findUnique({ where: { phone } });
  if (existing) {
    await prisma.interaction.create({
      data: { leadId: existing.id, direction: "in", body, messageId },
    });
    return { status: "duplicate" };
  }

  const { lead, consultant } = await prisma.$transaction(async (tx) => {
    const lead = await tx.lead.create({ data: { phone, name } });
    const consultant = await assignLeadRoundRobin(tx, lead.id);
    await tx.interaction.create({
      data: { leadId: lead.id, direction: "in", body, messageId },
    });
    return { lead, consultant };
  });

  if (!consultant) {
    console.warn(`[leads] no active consultant — lead ${lead.id} parked unassigned`);
    return { status: "created", consultant: null };
  }

  const templates = await prisma.messageTemplate.findMany({
    where: { key: { in: ["default_greeting", "consultant_notification"] } },
  });
  const greetingTemplate = templates.find((t) => t.key === "default_greeting");
  const notificationTemplate = templates.find(
    (t) => t.key === "consultant_notification",
  );

  if (!greetingTemplate) {
    console.warn(`[leads] template default_greeting missing — skipping lead reply`);
  }
  if (!notificationTemplate) {
    console.warn(
      `[leads] template consultant_notification missing — skipping consultant notify`,
    );
  }

  try {
    if (greetingTemplate) {
      const greeting = render(greetingTemplate.body, {
        leadName: name ?? "",
      });
      await sendText({ token, to: phone, text: greeting });
      await prisma.interaction.create({
        data: { leadId: lead.id, direction: "out", body: greeting },
      });
    }

    if (notificationTemplate) {
      const notification = render(notificationTemplate.body, {
        consultantName: consultant.name,
        leadName: name ?? "",
        leadPhone: phone,
      });
      await sendText({ token, to: consultant.phone, text: notification });
      await prisma.interaction.create({
        data: {
          leadId: lead.id,
          direction: "out",
          body: `[notify-consultant] ${notification}`,
        },
      });

      if (body) {
        await sendText({ token, to: consultant.phone, text: body });
        await prisma.interaction.create({
          data: {
            leadId: lead.id,
            direction: "out",
            body: `[forward-to-consultant] ${body}`,
          },
        });
      }
    }
  } catch (err) {
    console.error("[leads] uazapi send failed:", err);
  }

  return { status: "created", consultant };
}
