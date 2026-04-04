import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const nonnoId = cookieStore.get("nonnoenzo-id")?.value;

  // Allow unauthenticated saves too (cookie nome only, no SMS auth yet)
  const fallbackId = nonnoId || "anonymous";

  try {
    const { compagno, messaggi } = await req.json();

    if (!messaggi || messaggi.length === 0) {
      return NextResponse.json({ id: null, skipped: true });
    }

    // If no auth, try to find nonno by name cookie or skip DB save
    if (!nonnoId) {
      return NextResponse.json({ id: null, skipped: true, reason: "no-auth" });
    }

    const conversazione = await prisma.conversazione.create({
      data: {
        nonnoId,
        compagno: compagno || "marcello",
        messaggi: {
          create: messaggi.map((m: { ruolo: string; contenuto: string }) => ({
            ruolo: m.ruolo,
            contenuto: m.contenuto,
          })),
        },
        finitaIl: new Date(),
      },
    });

    // Generate summary + extract facts in background (non-blocking)
    extractMemories(nonnoId, conversazione.id, messaggi).catch((e) =>
      console.error("[conversazioni] Memory extraction failed:", e)
    );

    return NextResponse.json({ id: conversazione.id });
  } catch (error) {
    console.error("[conversazioni] Error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}

async function extractMemories(
  nonnoId: string,
  conversazioneId: string,
  messaggi: Array<{ ruolo: string; contenuto: string }>
) {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT?.trim();
  const apiKey = process.env.AZURE_OPENAI_API_KEY?.trim();
  const deployment = process.env.AZURE_OPENAI_CHAT_DEPLOYMENT?.trim();

  if (!endpoint || !apiKey || !deployment) return;

  const transcript = messaggi
    .map((m) => `${m.ruolo === "user" ? "Nonno" : "Marcello"}: ${m.contenuto}`)
    .join("\n");

  const url = `${endpoint}openai/deployments/${deployment}/chat/completions?api-version=2024-08-01-preview`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        {
          role: "system",
          content: `Analizza questa conversazione tra un anziano e il suo amico Marcello.
Rispondi SOLO con un JSON valido, nient'altro. Il formato è:
{
  "riassunto": "riassunto in 2-3 frasi di cosa si sono detti",
  "fatti": [
    {"tipo": "famiglia", "chiave": "nome_moglie", "valore": "Rosa"},
    {"tipo": "storia", "chiave": "infanzia_luogo", "valore": "Cresciuto a Napoli negli anni 50"},
    {"tipo": "preferenza", "chiave": "cibo_preferito", "valore": "pasta al forno"},
    {"tipo": "fatto", "chiave": "lavoro", "valore": "Faceva il falegname"}
  ]
}
Estrai SOLO fatti concreti menzionati dal nonno (non da Marcello).
Se non ci sono fatti nuovi, metti "fatti": [].
Il riassunto deve essere in italiano, breve, caldo.`,
        },
        { role: "user", content: transcript },
      ],
      temperature: 0.3,
      max_tokens: 500,
    }),
  });

  if (!response.ok) return;

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) return;

  try {
    const parsed = JSON.parse(content);

    // Save summary
    if (parsed.riassunto) {
      await prisma.conversazione.update({
        where: { id: conversazioneId },
        data: { riassunto: parsed.riassunto },
      });
    }

    // Save facts
    if (parsed.fatti && Array.isArray(parsed.fatti)) {
      for (const fatto of parsed.fatti) {
        if (fatto.tipo && fatto.chiave && fatto.valore) {
          await prisma.memoria.upsert({
            where: {
              nonnoId_tipo_chiave: {
                nonnoId,
                tipo: fatto.tipo,
                chiave: fatto.chiave,
              },
            },
            update: { valore: fatto.valore },
            create: {
              nonnoId,
              tipo: fatto.tipo,
              chiave: fatto.chiave,
              valore: fatto.valore,
            },
          });
        }
      }
    }
  } catch {
    console.error("[memoria] Failed to parse extraction result");
  }
}
