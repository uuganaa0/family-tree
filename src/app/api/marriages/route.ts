import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";

const canEdit = (role?: string) => role === "admin" || role === "sub-admin";

export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 401 });
  const marriages = await prisma.marriage.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(marriages);
}

// Хоёр одоо байгаа гишүүнийг гэр бүл болгох
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !canEdit(session.role)) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const { partner1Id, partner2Id, status } = await req.json();
  if (!partner1Id || !partner2Id || partner1Id === partner2Id) {
    return NextResponse.json({ error: "Хосын хоёр тал буруу байна" }, { status: 400 });
  }

  // Аль хэдийн ийм хос байгаа эсэхийг шалгана
  const existing = await prisma.marriage.findFirst({
    where: {
      OR: [
        { partner1Id, partner2Id },
        { partner1Id: partner2Id, partner2Id: partner1Id },
      ],
    },
  });
  if (existing) {
    return NextResponse.json({ error: "Энэ хос аль хэдийн бүртгэлтэй байна" }, { status: 400 });
  }

  const marriage = await prisma.marriage.create({
    data: { partner1Id, partner2Id, status: status === "divorced" ? "divorced" : null },
  });
  return NextResponse.json(marriage, { status: 201 });
}
