import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaPg } from "@prisma/adapter-pg";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
  adapter: () => {
    const connectionString = process.env["DATABASE_URL"];
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    return new PrismaPg({ connectionString });
  },
});
