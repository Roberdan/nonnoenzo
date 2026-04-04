import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const nonnoId = cookieStore.get("nonnoenzo-id")?.value;

  if (!nonnoId) {
    return NextResponse.json({ memorie: [], conversazioni: [] });
  }

  try {
    const [memorie, conversazioni] = await Promise.all([
      prisma.memoria.findMany({
        where: { nonnoId },
        orderBy: { creatoIl: "desc" },
        take: 50,
      }),
      prisma.conversazione.findMany({
        where: { nonnoId, riassunto: { not: null } },
        orderBy: { iniziataIl: "desc" },
        take: 3,
        select: { riassunto: true, iniziataIl: true },
      }),
    ]);

    return NextResponse.json({ memorie, conversazioni });
  } catch (error) {
    console.error("[memoria] Error:", error);
    return NextResponse.json({ memorie: [], conversazioni: [] });
  }
}
