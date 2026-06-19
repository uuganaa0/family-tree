import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/jwt";

// Нэг удаагийн migration: хуучин FamilyMember.spouseId хосуудыг Marriage мөр болгоно.
// Давтан дуудаж болно (idempotent) — аль хэдийн орсон хосыг алгасна.
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "admin") {
    return NextResponse.json({ error: "Зөвшөөрөлгүй" }, { status: 403 });
  }

  const members = await prisma.familyMember.findMany({
    where: { spouseId: { not: null } },
    select: { id: true, spouseId: true, spouseStatus: true },
  });

  const existing = await prisma.marriage.findMany();
  const seen = new Set(
    existing.map((m) => [m.partner1Id, m.partner2Id].sort().join("|"))
  );

  let created = 0;
  for (const m of members) {
    const sp = m.spouseId!;
    const key = [m.id, sp].sort().join("|");
    if (seen.has(key)) continue;
    seen.add(key);
    await prisma.marriage.create({
      data: {
        partner1Id: m.id,
        partner2Id: sp,
        status: m.spouseStatus === "divorced" ? "divorced" : null,
      },
    });
    created++;
  }

  return NextResponse.json({ ok: true, created, total: seen.size });
}
