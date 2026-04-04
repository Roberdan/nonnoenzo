import { NextResponse } from "next/server";

export const revalidate = 0;

// Simple per-IP rate limit: 1 req/sec
const lastRequest = new Map<string, number>();

function getClientIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(req: Request) {
  const clientIP = getClientIP(req);

  // Rate limit: 1 req/sec per IP
  const now = Date.now();
  const last = lastRequest.get(clientIP);
  if (last && now - last < 1000) {
    return NextResponse.json(
      { error: "Troppi tentativi. Aspetta un momento." },
      { status: 429 },
    );
  }
  lastRequest.set(clientIP, now);

  const endpoint = process.env.AZURE_OPENAI_REALTIME_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_REALTIME_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_REALTIME_DEPLOYMENT?.trim();

  if (!endpoint || !apiKey || !deployment) {
    return NextResponse.json(
      { error: "Azure OpenAI non configurato" },
      { status: 503 },
    );
  }

  // GA protocol: POST to /openai/v1/realtime/client_secrets
  const url = new URL(endpoint);
  const azureUrl = `${url.protocol}//${url.hostname}/openai/v1/realtime/client_secrets`;

  const payload = {
    session: {
      type: "realtime",
      model: deployment,
    },
  };

  try {
    const response = await fetch(azureUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[ephemeral-token] Azure error:", response.status, errorText.slice(0, 200));
      return NextResponse.json(
        { error: "Errore Azure", details: errorText.slice(0, 200) },
        { status: response.status >= 500 ? 503 : response.status },
      );
    }

    const data = await response.json();

    // GA response: { value, expires_at, session: { id } }
    if (data.value && data.expires_at) {
      return NextResponse.json({
        token: data.value,
        expiresAt: data.expires_at,
        sessionId: data.session?.id || "",
      });
    }

    // Preview response: { client_secret: { value, expires_at }, id }
    if (data.client_secret?.value) {
      return NextResponse.json({
        token: data.client_secret.value,
        expiresAt: data.client_secret.expires_at,
        sessionId: data.id || "",
      });
    }

    console.error("[ephemeral-token] Unexpected Azure response shape");
    return NextResponse.json(
      { error: "Risposta Azure non valida" },
      { status: 503 },
    );
  } catch (error) {
    console.error("[ephemeral-token] Fetch error:", error);
    return NextResponse.json(
      { error: "Impossibile contattare Azure" },
      { status: 503 },
    );
  }
}
