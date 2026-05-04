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
  "Você será atendido(a) pelo nosso consultor *{{consultantName}}*.",
  "Contato direto: {{consultantPhone}}",
].join("\n");

async function main() {
  // await prisma.roundRobinState.upsert({
  //   where: { id: "singleton" },
  //   update: {},
  //   create: { id: "singleton" },
  // });
  // await prisma.messageTemplate.upsert({
  //   where: { key: "default_greeting" },
  //   update: {},
  //   create: { key: "default_greeting", body: DEFAULT_GREETING },
  // });
  // const consultants = Array.from({ length: 5 }, (_, i) => ({
  //   name: faker.person.fullName(),
  //   phone: `55${faker.string.numeric(2)}9${faker.string.numeric(8)}`,
  //   order: i,
  // }));
  // for (const consultant of consultants) {
  //   await prisma.consultant.create({
  //     data: {
  //       phone: consultant.phone,
  //       name: consultant.name,
  //       order: consultant.order,
  //     },
  //   });
  // }
  // console.log(
  //   "seed: consultants →",
  //   consultants.map((c) => `${c.name} (${c.phone})`).join(", "),
  // );

  await prisma.lead.updateMany({
    where: { phone: "558699208959" },
    data: {
      phone: faker.string.numeric(11),
    },
  });
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
