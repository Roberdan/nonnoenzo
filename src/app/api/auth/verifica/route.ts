import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const { codice } = await req.json();

    if (!codice || typeof codice !== "string" || codice.length < 4) {
      return NextResponse.json({ error: "Codice non valido" }, { status: 400 });
    }

    const record = await prisma.codice.findUnique({
      where: { codice: codice.trim() },
      include: { nonno: true },
    });

    if (!record) {
      return NextResponse.json({ error: "Codice non trovato" }, { status: 404 });
    }

    if (record.usatoIl) {
      return NextResponse.json({ error: "Codice già utilizzato" }, { status: 410 });
    }

    // Mark code as used
    await prisma.codice.update({
      where: { id: record.id },
      data: { usatoIl: new Date() },
    });

    const response = NextResponse.json({
      nonnoId: record.nonno.id,
      nome: record.nonno.nome,
      compagnoPref: record.nonno.compagnoPref,
    });

    // Set long-lived cookie (1 year)
    response.cookies.set("nonnoenzo-id", record.nonno.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("[auth/verifica] Error:", error);
    return NextResponse.json({ error: "Errore interno" }, { status: 500 });
  }
}
