import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";
import { storePhoto } from "@/lib/blob";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 401 });
  }
  const members = await prisma.familyMember.findMany({
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(members);
}

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session || !["admin", "sub-admin"].includes(session.role)) {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const { name, birthYear, deathYear, gender, note, photo, parentId, parent2Id, spouseForId, childForId, relation } = await req.json();

  if (!name?.trim()) {
    return NextResponse.json({ error: "Нэр оруулна уу" }, { status: 400 });
  }

  // Хүүхэд нэмэх үед нөгөө эцэг/эхийг тодорхойлох:
  // тодорхой ирээгүй бол эцэг/эхийн цорын ганц (салаагүй) хосоос автоматаар авна.
  let resolvedParent2: string | null = parent2Id || null;
  if (parentId && !resolvedParent2) {
    const marriages = await prisma.marriage.findMany({
      where: { OR: [{ partner1Id: parentId }, { partner2Id: parentId }] },
    });
    const active = marriages.filter((m) => m.status !== "divorced");
    const pick = active.length === 1 ? active[0] : marriages.length === 1 ? marriages[0] : null;
    if (pick) resolvedParent2 = pick.partner1Id === parentId ? pick.partner2Id : pick.partner1Id;
  }

  // Дээд тал руу аав/эж нэмэх үед — зорилтот хүн аль хэдийн эцэг эхтэй бол зөвшөөрөхгүй
  if (childForId) {
    const child = await prisma.familyMember.findUnique({ where: { id: childForId } });
    if (!child) {
      return NextResponse.json({ error: "Хүүхэд олдсонгүй" }, { status: 404 });
    }
    if (child.parentId) {
      return NextResponse.json(
        { error: "Энэ хүн аль хэдийн эцэг эхтэй байна" },
        { status: 400 }
      );
    }
  }

  let photoUrl: string | null;
  try {
    photoUrl = await storePhoto(photo);
  } catch (e) {
    console.error("Blob upload failed:", e);
    return NextResponse.json(
      { error: "Зураг хадгалж чадсангүй (Blob тохиргоог шалгана уу)" },
      { status: 500 }
    );
  }

  const member = await prisma.familyMember.create({
    data: {
      name: name.trim(),
      birthYear: birthYear ? Number(birthYear) : null,
      deathYear: deathYear ? Number(deathYear) : null,
      gender: gender || null,
      note: note || null,
      photo: photoUrl,
      parentId: parentId || null,
      parent2Id: parentId ? resolvedParent2 : null,
      // relation зөвхөн хүүхэд нэмэх үед (parentId байх) утгатай
      relation: parentId && (relation === "adopted" || relation === "step") ? relation : null,
    },
  });

  // Хэрэв эхнэр/нөхрийн хувьд нэмсэн бол шинэ Marriage үүсгэнэ
  if (spouseForId) {
    await prisma.marriage.create({
      data: { partner1Id: spouseForId, partner2Id: member.id, status: null },
    });
  }

  // Хэрэв дээд тал руу аав/эж нэмсэн бол зорилтот хүнийг шинэ гишүүний хүүхэд болгоно
  if (childForId) {
    await prisma.familyMember.update({
      where: { id: childForId },
      data: { parentId: member.id },
    });
  }

  await prisma.activityLog.create({
    data: { userId: session.userId, userName: session.name, action: "create", memberName: member.name },
  });

  return NextResponse.json(member, { status: 201 });
}
