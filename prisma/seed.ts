import "dotenv/config";
import { faker } from "@faker-js/faker";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const DEFAULT_GREETING = [
  "Olá {{leadName}}! Recebemos seu contato.",
  "Um de nossos atendentes irá lhe atender logo logo.",
].join("\n");

const CONSULTANT_NOTIFICATION = [
  "Olá {{consultantName}}, chegou novo cliente para atendimento.",
  "Nome: {{leadName}}",
  "Contato: {{leadPhone}}",
].join("\n");

async function main() {
  await prisma.roundRobinState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
  await prisma.messageTemplate.upsert({
    where: { key: "default_greeting" },
    update: { body: DEFAULT_GREETING },
    create: { key: "default_greeting", body: DEFAULT_GREETING },
  });
  await prisma.messageTemplate.upsert({
    where: { key: "consultant_notification" },
    update: { body: CONSULTANT_NOTIFICATION },
    create: { key: "consultant_notification", body: CONSULTANT_NOTIFICATION },
  });
  const consultants = [
    {
      name: "Arthur",
      phone: `558699208959`,
      order: 1,
    },
    {
      name: "Jão",
      phone: `558688923098`,
      order: 2,
    },
  ];
  for (const consultant of consultants) {
    await prisma.consultant.create({
      data: {
        phone: consultant.phone,
        name: consultant.name,
        order: consultant.order,
      },
    });
  }
  console.log(
    "seed: consultants →",
    consultants.map((c) => `${c.name} (${c.phone})`).join(", "),
  );

  // await prisma.lead.updateMany({
  //   where: { phone: "558699208959" },
  //   data: {
  //     phone: faker.string.numeric(11),
  //   },
  // });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
