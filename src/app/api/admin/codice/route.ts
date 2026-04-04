import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const adminKey = url.searchParams.get("key");

  if (adminKey !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }

  try {
    const { nome, telefono } = await req.json();

    if (!nome || typeof nome !== "string") {
      return NextResponse.json({ error: "Nome obbligatorio" }, { status: 400 });
    }

    // Create nonno
    const nonno = await prisma.nonno.create({
      data: { nome: nome.trim(), telefono: telefono?.trim() || null },
    });

    // Generate 6-digit code
    const codice = Math.floor(100000 + Math.random() * 900000).toString();

    await prisma.codice.create({
      data: {
        codice,
        nonnoId: nonno.id,
        telefono: telefono?.trim() || null,
      },
    });

    return NextResponse.json({
      nonnoId: nonno.id,
      nome: nonno.nome,
      codice,
      messaggio: `Codice per ${nome}: ${codice}`,
    });
  } catch (error) {
    console.error("[admin/codice] Error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
