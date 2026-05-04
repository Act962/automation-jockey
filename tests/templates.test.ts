import {
  vi,
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "vitest";

vi.mock("../src/db.ts");

import { buildApp } from "../src/app.ts";
import { prisma } from "../src/db.ts";

const TEMPLATE = {
  id: "t1",
  key: "greeting",
  body: "Olá {{leadName}}, sou {{consultantName}}!",
  updatedAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("Templates", () => {
  const app = buildApp();

  beforeAll(() => app.ready());
  afterAll(() => app.close());
  beforeEach(() => vi.clearAllMocks());

  describe("GET /templates/:key", () => {
    it("retorna 200 com template existente", async () => {
      vi.mocked(prisma.messageTemplate.findUnique).mockResolvedValue(TEMPLATE);

      const res = await app.inject({
        method: "GET",
        url: "/templates/greeting",
      });

      expect(res.statusCode).toBe(200);
      const body = res.json();
      expect(body.key).toBe("greeting");
      expect(body.body).toBe(TEMPLATE.body);
    });

    it("retorna 404 quando template não existe", async () => {
      vi.mocked(prisma.messageTemplate.findUnique).mockResolvedValue(null);

      const res = await app.inject({ method: "GET", url: "/templates/nope" });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("not_found");
    });
  });

  describe("PUT /templates/:key", () => {
    it("retorna 200 ao criar ou atualizar template", async () => {
      vi.mocked(prisma.messageTemplate.upsert).mockResolvedValue(TEMPLATE);

      const res = await app.inject({
        method: "PUT",
        url: "/templates/greeting",
        payload: { body: "Olá {{leadName}}, sou {{consultantName}}!" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().key).toBe("greeting");
    });

    it("retorna 400 quando body está vazio", async () => {
      const res = await app.inject({
        method: "PUT",
        url: "/templates/greeting",
        payload: { body: "" },
      });

      expect(res.statusCode).toBe(400);
    });
  });
});
