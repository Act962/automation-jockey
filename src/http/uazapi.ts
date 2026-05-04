import { env } from "../env.ts";

type SendTextArgs = { token: string; to: string; text: string };

export async function sendText({ token, to, text }: SendTextArgs): Promise<unknown> {
  const res = await fetch(`${env.UAZAPI_BASE_URL}/send/text`, {
    method: "POST",
    headers: { "Content-Type": "application/json", token },
    body: JSON.stringify({ number: to, text }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`uazapi sendText ${res.status}: ${body}`);
  }
  return res.json().catch(() => ({}));
}
