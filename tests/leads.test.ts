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

const CONSULTANT = { id: "con1", name: "Bob", phone: "5511999990002" };

const LEAD = {
  id: "l1",
  phone: "5511888880001",
  name: "João",
  consultantId: "con1",
  createdAt: new Date("2024-06-01T00:00:00.000Z"),
  consultant: CONSULTANT,
};

describe("Leads", () => {
  const app = buildApp();

  beforeAll(() => app.ready());
  afterAll(() => app.close());
  beforeEach(() => vi.clearAllMocks());

  describe("GET /leads", () => {
    it("retorna 200 com lista paginada", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([[LEAD], 1]);

      const res = await app.inject({ method: "GET", url: "/leads" });

      expect(res.statusCode).toBe(200);
      const body = res.json<{
        data: unknown[];
        total: number;
        page: number;
        limit: number;
      }>();
      expect(body.data).toHaveLength(1);
      expect(body.total).toBe(1);
      expect(body.page).toBe(1);
      expect(body.limit).toBe(20);
    });

    it("aceita filtro por consultantId via query", async () => {
      vi.mocked(prisma.$transaction).mockResolvedValue([[LEAD], 1]);

      const res = await app.inject({
        method: "GET",
        url: "/leads?consultantId=con1&page=2&limit=5",
      });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ page: number; limit: number }>();
      expect(body.page).toBe(2);
      expect(body.limit).toBe(5);
    });

    it("retorna 400 quando limit excede 100", async () => {
      const res = await app.inject({ method: "GET", url: "/leads?limit=200" });
      expect(res.statusCode).toBe(400);
    });
  });

  describe("GET /leads/:id", () => {
    it("retorna 200 com lead e consultor", async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue(LEAD);

      const res = await app.inject({ method: "GET", url: "/leads/l1" });

      expect(res.statusCode).toBe(200);
      const body = res.json<{ id: string; consultant: typeof CONSULTANT }>();
      expect(body.id).toBe("l1");
      expect(body.consultant?.name).toBe("Bob");
    });

    it("retorna 404 quando lead não existe", async () => {
      vi.mocked(prisma.lead.findUnique).mockResolvedValue(null);

      const res = await app.inject({ method: "GET", url: "/leads/nope" });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("not_found");
    });
  });

  describe("PATCH /leads/:id", () => {
    it("retorna 200 ao atualizar nome", async () => {
      const updated = { ...LEAD, name: "João Silva" };
      vi.mocked(prisma.lead.update).mockResolvedValue(updated);

      const res = await app.inject({
        method: "PATCH",
        url: "/leads/l1",
        payload: { name: "João Silva" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe("João Silva");
    });

    it("retorna 200 ao reatribuir consultor para null", async () => {
      const updated = { ...LEAD, consultantId: null, consultant: null };
      vi.mocked(prisma.lead.update).mockResolvedValue(updated);

      const res = await app.inject({
        method: "PATCH",
        url: "/leads/l1",
        payload: { consultantId: null },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().consultant).toBeNull();
    });

    it("retorna 404 quando lead não existe", async () => {
      vi.mocked(prisma.lead.update).mockRejectedValue(new Error("Not found"));

      const res = await app.inject({
        method: "PATCH",
        url: "/leads/nope",
        payload: { name: "X" },
      });

      expect(res.statusCode).toBe(404);
    });
  });

  describe("DELETE /leads/:id", () => {
    it("retorna 204 ao deletar lead", async () => {
      vi.mocked(prisma.lead.delete).mockResolvedValue(LEAD);

      const res = await app.inject({ method: "DELETE", url: "/leads/l1" });

      expect(res.statusCode).toBe(204);
    });

    it("retorna 404 quando lead não existe", async () => {
      vi.mocked(prisma.lead.delete).mockRejectedValue(new Error("Not found"));

      const res = await app.inject({ method: "DELETE", url: "/leads/nope" });

      expect(res.statusCode).toBe(404);
    });
  });
});
