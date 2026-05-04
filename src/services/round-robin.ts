import type { Consultant, Prisma } from "../generated/prisma/client.ts";

export async function assignLeadRoundRobin(
  tx: Prisma.TransactionClient,
  leadId: string,
): Promise<Consultant | null> {
  await tx.$executeRaw`SELECT id FROM "RoundRobinState" WHERE id = 'singleton' FOR UPDATE`;

  const state = await tx.roundRobinState.findUnique({ where: { id: "singleton" } });
  const consultants = await tx.consultant.findMany({
    where: { active: true },
    orderBy: [{ order: "asc" }, { id: "asc" }],
  });
  if (consultants.length === 0) return null;

  const idx = state?.lastConsultantId
    ? consultants.findIndex((c) => c.id === state.lastConsultantId)
    : -1;
  const next = consultants[(idx + 1) % consultants.length]!;

  await tx.roundRobinState.update({
    where: { id: "singleton" },
    data: { lastConsultantId: next.id },
  });
  await tx.lead.update({
    where: { id: leadId },
    data: { consultantId: next.id },
  });

  return next;
}
