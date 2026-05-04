import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.ts";

const connectionString = process.env["DATABASE_URL"];
if (!connectionString) throw new Error("DATABASE_URL is not set");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const DEFAULT_GREETING = [
  "Olá {{leadName}}! Recebemos seu contato.",
  "Você será atendido(a) pelo nosso consultor *{{consultantName}}*.",
  "Contato direto: {{consultantPhone}}",
].join("\n");

async function main() {
  await prisma.roundRobinState.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  await prisma.messageTemplate.upsert({
    where: { key: "default_greeting" },
    update: {},
    create: { key: "default_greeting", body: DEFAULT_GREETING },
  });

  await prisma.consultant.upsert({
    where: { id: "seed-consultant-1" },
    update: {},
    create: {
      id: "seed-consultant-1",
      name: "Consultor Exemplo",
      phone: "5511999999999",
      order: 0,
    },
  });

  console.log("seed: ok");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
