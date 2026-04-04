import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";

export async function GET() {
  const cookieStore = await cookies();
  const nonnoId = cookieStore.get("nonnoenzo-id")?.value;

  if (!nonnoId) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  try {
    const nonno = await prisma.nonno.findUnique({
      where: { id: nonnoId },
      select: { id: true, nome: true, compagnoPref: true },
    });

    if (!nonno) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({ authenticated: true, ...nonno });
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}
