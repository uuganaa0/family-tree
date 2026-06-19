import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";
import { storePhoto, deletePhoto } from "@/lib/blob";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });

  const { id } = await params;
  const { name, birthYear, deathYear, gender, note, photo, relation, spouseStatus } = await req.json();

  if (!name?.trim()) return NextResponse.json({ error: "Нэр оруулна уу" }, { status: 400 });

  const existing = await prisma.familyMember.findUnique({ where: { id } });

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

  // Зураг солигдсон/устсан бол хуучин Blob файлыг цэвэрлэнэ
  if (existing?.photo && existing.photo !== photoUrl) {
    await deletePhoto(existing.photo);
  }

  const updated = await prisma.familyMember.update({
    where: { id },
    data: {
      name: name.trim(),
      birthYear: birthYear ? Number(birthYear) : null,
      deathYear: deathYear ? Number(deathYear) : null,
      gender: gender || null,
      note: note || null,
      photo: photoUrl,
      // relation зөвхөн эцэг эхтэй (parentId байх) бол утгатай
      relation: existing?.parentId && (relation === "adopted" || relation === "step") ? relation : null,
      spouseStatus: existing?.spouseId && spouseStatus === "divorced" ? "divorced" : null,
    },
  });

  // Гэр бүлийн байдлыг хосын нөгөө талд нь sync хийнэ
  if (existing?.spouseId) {
    await prisma.familyMember.update({
      where: { id: existing.spouseId },
      data: { spouseStatus: spouseStatus === "divorced" ? "divorced" : null },
    });
  }

  await prisma.activityLog.create({
    data: { userId: session.userId, userName: session.name, action: "update", memberName: updated.name },
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const { id } = await params;

  const member = await prisma.familyMember.findUnique({ where: { id } });

  // Эхнэр/нөхрийн холбоос цэвэрлэнэ
  if (member?.spouseId) {
    await prisma.familyMember.update({
      where: { id: member.spouseId },
      data: { spouseId: null },
    });
  }
  // spouseId нь энэ хүнийг заасан бусад гишүүнийг цэвэрлэнэ
  await prisma.familyMember.updateMany({
    where: { spouseId: id },
    data: { spouseId: null },
  });

  // Хүүхдүүдийг эцэг эхгүй болгоно
  await prisma.familyMember.updateMany({
    where: { parentId: id },
    data: { parentId: null },
  });

  await prisma.familyMember.delete({ where: { id } });

  // Гишүүний зургийг Blob store-оос цэвэрлэнэ
  await deletePhoto(member?.photo);

  await prisma.activityLog.create({
    data: { userId: session.userId, userName: session.name, action: "delete", memberName: member?.name ?? id },
  });

  return NextResponse.json({ ok: true });
}
