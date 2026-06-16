import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";

export async function GET() {
  const members = await prisma.familyMember.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Нэвтэрнэ үү" }, { status: 401 });
  }

  const { name, birthYear, deathYear, gender, note, parentId, spouseForId } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Нэр оруулна уу" }, { status: 400 });
  }

  const member = await prisma.familyMember.create({
    data: {
      name: name.trim(),
      birthYear: birthYear ? Number(birthYear) : null,
      deathYear: deathYear ? Number(deathYear) : null,
      gender: gender || null,
      note: note || null,
      parentId: parentId || null,
      spouseId: spouseForId || null,
    },
  });

  // Хэрэв эхнэр/нөхрийн хувьд нэмсэн бол хоёр талд холбоно
  if (spouseForId) {
    await prisma.familyMember.update({
      where: { id: spouseForId },
      data: { spouseId: member.id },
    });
  }

  return NextResponse.json(member, { status: 201 });
}
