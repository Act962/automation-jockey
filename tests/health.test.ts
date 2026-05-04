import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { buildApp } from "../src/app.ts";

describe("GET /health", () => {
  const app = buildApp();

  beforeAll(() => app.ready());
  afterAll(() => app.close());

  it("retorna 200 com { ok: true }", async () => {
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });
});
