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

const CONSULTANT = {
  id: "c1",
  name: "Alice",
  phone: "5511999990001",
  active: true,
  order: 0,
  createdAt: new Date("2024-01-01T00:00:00.000Z"),
};

describe("Consultants", () => {
  const app = buildApp();

  beforeAll(() => app.ready());
  afterAll(() => app.close());
  beforeEach(() => vi.clearAllMocks());

  describe("GET /consultants", () => {
    it("retorna 200 com lista de consultores", async () => {
      vi.mocked(prisma.consultant.findMany).mockResolvedValue([CONSULTANT]);

      const res = await app.inject({ method: "GET", url: "/consultants" });

      expect(res.statusCode).toBe(200);
      const body = res.json<(typeof CONSULTANT)[]>();
      expect(body).toHaveLength(1);
      expect(body[0].id).toBe("c1");
      expect(body[0].name).toBe("Alice");
    });

    it("retorna lista vazia quando não há consultores", async () => {
      vi.mocked(prisma.consultant.findMany).mockResolvedValue([]);

      const res = await app.inject({ method: "GET", url: "/consultants" });

      expect(res.statusCode).toBe(200);
      expect(res.json()).toEqual([]);
    });
  });

  describe("POST /consultants", () => {
    it("retorna 201 com consultor criado", async () => {
      vi.mocked(prisma.consultant.create).mockResolvedValue(CONSULTANT);

      const res = await app.inject({
        method: "POST",
        url: "/consultants",
        payload: { name: "Alice", phone: "5511999990001" },
      });

      expect(res.statusCode).toBe(201);
      expect(res.json().id).toBe("c1");
    });

    it("retorna 400 quando body inválido (name ausente)", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/consultants",
        payload: { phone: "5511999990001" },
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("PATCH /consultants/:id", () => {
    it("retorna 200 com consultor atualizado", async () => {
      const updated = { ...CONSULTANT, name: "Alice Updated" };
      vi.mocked(prisma.consultant.update).mockResolvedValue(updated);

      const res = await app.inject({
        method: "PATCH",
        url: "/consultants/c1",
        payload: { name: "Alice Updated" },
      });

      expect(res.statusCode).toBe(200);
      expect(res.json().name).toBe("Alice Updated");
    });

    it("retorna 404 quando consultor não existe", async () => {
      vi.mocked(prisma.consultant.update).mockRejectedValue(
        new Error("Not found"),
      );

      const res = await app.inject({
        method: "PATCH",
        url: "/consultants/nope",
        payload: { name: "X" },
      });

      expect(res.statusCode).toBe(404);
      expect(res.json().error).toBe("not_found");
    });
  });

  describe("DELETE /consultants/:id", () => {
    it("retorna 204 ao deletar consultor existente", async () => {
      vi.mocked(prisma.consultant.delete).mockResolvedValue(CONSULTANT);

      const res = await app.inject({
        method: "DELETE",
        url: "/consultants/c1",
      });

      expect(res.statusCode).toBe(204);
      expect(res.body).toBe("");
    });

    it("retorna 404 quando consultor não existe", async () => {
      vi.mocked(prisma.consultant.delete).mockRejectedValue(
        new Error("Not found"),
      );

      const res = await app.inject({
        method: "DELETE",
        url: "/consultants/nope",
      });

      expect(res.statusCode).toBe(404);
    });
  });
});
