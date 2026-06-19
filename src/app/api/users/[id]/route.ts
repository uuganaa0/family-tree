import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";

const ROLES = ["admin", "sub-admin", "viewer"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }
  const { id } = await params;
  const { name, email, password, role } = await req.json();

  const data: { name?: string; email?: string; password?: string; role?: string } = {};

  if (role !== undefined) {
    if (!ROLES.includes(role)) {
      return NextResponse.json({ error: "Буруу role" }, { status: 400 });
    }
    data.role = role;
  }

  if (name !== undefined) {
    if (!name.trim()) return NextResponse.json({ error: "Нэр оруулна уу" }, { status: 400 });
    data.name = name.trim();
  }

  if (email !== undefined) {
    const e = email.trim().toLowerCase();
    if (!e) return NextResponse.json({ error: "Email оруулна уу" }, { status: 400 });
    // Өөр хэрэглэгч энэ email-тэй эсэхийг шалгана
    const dup = await prisma.user.findFirst({ where: { email: e, NOT: { id } } });
    if (dup) return NextResponse.json({ error: "Энэ email бүртгэлтэй байна" }, { status: 400 });
    data.email = e;
  }

  if (password) {
    if (password.length < 6) return NextResponse.json({ error: "Нууц үг 6+ тэмдэгт байх ёстой" }, { status: 400 });
    data.password = await bcrypt.hash(password, 12);
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Өөрчлөх зүйл алга" }, { status: 400 });
  }

  await prisma.user.update({ where: { id }, data });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }
  const { id } = await params;
  if (id === session.userId) {
    return NextResponse.json({ error: "Өөрийгөө устгах боломжгүй" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
