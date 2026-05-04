import { prisma } from "../db.ts";
import { sendContact, sendText } from "../http/uazapi.ts";
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

  const template = await prisma.messageTemplate.findUnique({
    where: { key: "default_greeting" },
  });

  if (!template) {
    console.warn(`[leads] template default_greeting missing — skipping send`);
    return { status: "created", consultant };
  }

  const text = render(template.body, {
    leadName: name ?? "",
    consultantName: consultant.name,
    consultantPhone: consultant.phone,
  });

  try {
    await sendText({ token, to: phone, text });
    await prisma.interaction.create({
      data: { leadId: lead.id, direction: "out", body: text },
    });
    await sendContact({ token, to: phone, fullName: consultant.name, phoneNumber: consultant.phone });
    await prisma.interaction.create({
      data: { leadId: lead.id, direction: "out", body: `[contact] ${consultant.name} <${consultant.phone}>` },
    });
  } catch (err) {
    console.error("[leads] uazapi send failed:", err);
  }

  return { status: "created", consultant };
}
