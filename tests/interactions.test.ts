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

const INTERACTION = {
  id: "i1",
  leadId: "l1",
  direction: "in",
  body: "Olá, quero saber mais",
  messageId: "msg123",
  createdAt: new Date("2024-06-01T10:00:00.000Z"),
};

describe("Interactions", () => {
  const app = buildApp();

  beforeAll(() => app.ready());
  afterAll(() => app.close());
  beforeEach(() => vi.clearAllMocks());

  describe("GET /leads/:leadId/interactions", () => {
    it("retorna 200 com histórico paginado", async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue({
        id: "l1",
      } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([[INTERACTION], 1]);

      const res = await app.inject({
        method: "GET",
        url: "/leads/l1/interactions",
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ data: unknown[]; total: number }>();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
    });

    it("retorna 404 quando lead não existe", async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue(null);

      const res = await app.inject({
        method: "GET",
        url: "/leads/nope/interactions",
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("lead_not_found");
    });

    it("aceita parâmetros de paginação", async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue({
        id: "l1",
      } as never);
      vi.mocked(prisma.$transaction).mockResolvedValue([[], 0]);

      const res = await app.inject({
        method: "GET",
        url: "/leads/l1/interactions?page=2&limit=10",
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ page: number; limit: number }>();
      expect(body.page).toBe(2);
      expect(body.limit).toBe(10);
    });
  });

  describe("POST /leads/:leadId/interactions", () => {
    it("retorna 201 com interação criada", async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue({
        id: "l1",
      } as never);
      vi.mocked(prisma.interaction.create).mockResolvedValue(INTERACTION);

      const res = await app.inject({
        method: "POST",
        url: "/leads/l1/interactions",
        payload: {
          direction: "in",
          body: "Olá, quero saber mais",
          messageId: "msg123",
        },
      });

      expect(res.statusCode).toBe(201);
      const body = res.json<typeof INTERACTION>();
      expect(body.direction).toBe("in");
      expect(body.body).toBe("Olá, quero saber mais");
    });

    it("retorna 400 quando direction é inválida", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/leads/l1/interactions",
        payload: { direction: "invalid", body: "Texto" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("retorna 400 quando body está vazio", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/leads/l1/interactions",
        payload: { direction: "out", body: "" },
      });

      expect(res.statusCode).toBe(400);
    });

    it("retorna 404 quando lead não existe", async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue(null);

      const res = await app.inject({
        method: "POST",
        url: "/leads/nope/interactions",
        payload: { direction: "out", body: "Mensagem" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /leads/:leadId/interactions/:id", () => {
    it("retorna 204 ao deletar interação", async () => {
      vi.mocked(prisma.interaction.delete).mockResolvedValue(INTERACTION);

      const res = await app.inject({
        method: "DELETE",
        url: "/leads/l1/interactions/i1",
      });

      expect(res.statusCode).toBe(204);
    });

    it("retorna 404 quando interação não existe", async () => {
      vi.mocked(prisma.interaction.delete).mockRejectedValue(
        new Error("Not found"),
      );

      const res = await app.inject({
        method: "DELETE",
        url: "/leads/l1/interactions/nope",
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
