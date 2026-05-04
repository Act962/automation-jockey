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
vi.mock("../src/services/leads.ts", () => ({
  processIncomingMessage: vi.fn(),
}));

import { buildApp } from "../src/app.ts";
import { processIncomingMessage } from "../src/services/leads.ts";

const BASE_PAYLOAD = {
  EventType: "messages",
  token: "tok123",
  message: {
    chatid: "5511988880001@s.whatsapp.net",
    fromMe: false,
    senderName: "João",
    messageid: "msg1",
    messageType: "Conversation",
    text: "Olá",
    content: null,
  },
  chat: { name: "João" },
};

describe("POST /webhooks/uazapi", () => {
  const app = buildApp();

  beforeAll(() => app.ready());
  afterAll(() => app.close());
  beforeEach(() => vi.clearAllMocks());

  it("processa mensagem válida e retorna { ok: true, status }", async () => {
    vi.mocked(processIncomingMessage).mockResolvedValue({
      status: "created",
      consultant: { id: "c1", name: "Bob", phone: "5511999990001" },
    });

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/uazapi",
      payload: BASE_PAYLOAD,
    });

    expect(res.statusCode).toBe(200);
    const body = res.json<{ ok: boolean; status?: string }>();
    expect(body.ok).toBe(true);
    expect(processIncomingMessage).toHaveBeenCalledOnce();
  });

  it("ignora evento que não seja 'messages'", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/uazapi",
      payload: { ...BASE_PAYLOAD, EventType: "presence" },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ignored).toBe("presence");
    expect(processIncomingMessage).not.toHaveBeenCalled();
  });

  it("ignora mensagem enviada pelo próprio número (fromMe)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/uazapi",
      payload: {
        ...BASE_PAYLOAD,
        message: { ...BASE_PAYLOAD.message, fromMe: true },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ignored).toBe("fromMe_or_empty");
    expect(processIncomingMessage).not.toHaveBeenCalled();
  });

  it("ignora mensagem sem token", async () => {
    const { token: _, ...payloadSemToken } = BASE_PAYLOAD;

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/uazapi",
      payload: payloadSemToken,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ignored).toBe("no_token");
    expect(processIncomingMessage).not.toHaveBeenCalled();
  });

  it("ignora tipo de mensagem não suportado (ex: image)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/webhooks/uazapi",
      payload: {
        ...BASE_PAYLOAD,
        message: { ...BASE_PAYLOAD.message, messageType: "ImageMessage" },
      },
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ignored).toBe("type:ImageMessage");
    expect(processIncomingMessage).not.toHaveBeenCalled();
  });

  it("lead duplicado retorna status 'duplicate'", async () => {
    vi.mocked(processIncomingMessage).mockResolvedValue({
      status: "duplicate",
    });

    const res = await app.inject({
      method: "POST",
      url: "/webhooks/uazapi",
      payload: BASE_PAYLOAD,
    });

    expect(res.statusCode).toBe(200);
    expect(res.json().ok).toBe(true);
  });
});
