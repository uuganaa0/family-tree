import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";

const canEdit = (role?: string) => role === "admin" || role === "sub-admin";

// Гэр бүлийн байдал солих (гэрлэсэн ⇄ салсан)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }
  const { id } = await params;
  const { status } = await req.json();
  const updated = await prisma.marriage.update({
    where: { id },
    data: { status: status === "divorced" ? "divorced" : null },
  });
  return NextResponse.json(updated);
}

// Гэр бүлийн холбоо устгах (хосыг салгах, хүнийг устгахгүй). Admin only.
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }
  const { id } = await params;
  await prisma.marriage.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
