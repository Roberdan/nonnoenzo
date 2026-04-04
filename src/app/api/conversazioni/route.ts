import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const cookieStore = await cookies();
  const nonnoId = cookieStore.get("nonnoenzo-id")?.value;
  if (!nonnoId) {
    return NextResponse.json({ error: "Non autenticato" }, { status: 401 });
  }

  try {
    const { compagno, messaggi } = await req.json();

    const conversazione = await prisma.conversazione.create({
      data: {
        nonnoId,
        compagno: compagno || "marcello",
        messaggi: {
          create: (messaggi || []).map((m: { ruolo: string; contenuto: string }) => ({
            ruolo: m.ruolo,
            contenuto: m.contenuto,
          })),
        },
        finitaIl: new Date(),
      },
    });

    return NextResponse.json({ id: conversazione.id });
  } catch (error) {
    console.error("[conversazioni] Error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
