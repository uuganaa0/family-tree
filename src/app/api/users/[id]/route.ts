import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }
  const { id } = await params;
  const { role } = await req.json();
  if (!["admin", "viewer"].includes(role)) {
    return NextResponse.json({ error: "Буруу role" }, { status: 400 });
  }
  await prisma.user.update({ where: { id }, data: { role } });
  return NextResponse.json({ ok: true });
}
