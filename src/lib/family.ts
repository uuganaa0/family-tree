export interface MemberLike {
  id: string;
  name: string;
  gender?: string | null;
  parentId?: string | null;
  parent2Id?: string | null; // нөгөө эцэг/эх (хосын нөгөө тал)
  spouseId?: string | null;   // legacy — зөвхөн миграци хийгээгүй хуучин өгөгдөлд
}

export function getFatherName(m: MemberLike, memberMap: Map<string, MemberLike>): string {
  if (!m.parentId) return "";
  const parent = memberMap.get(m.parentId);
  if (!parent) return "";
  if (parent.gender === "male" || !parent.gender) return parent.name;
  // Бичсэн эцэг/эх нь эмэгтэй бол аавыг хүүхдийн нөгөө эцэг/эхээс (parent2Id) ол
  if (m.parent2Id) {
    const other = memberMap.get(m.parent2Id);
    if (other && (other.gender === "male" || !other.gender)) return other.name;
  }
  // Legacy fallback — Marriage руу шилжээгүй хуучин өгөгдөлд
  if (parent.spouseId) {
    const spouse = memberMap.get(parent.spouseId);
    if (spouse && (spouse.gender === "male" || !spouse.gender)) return spouse.name;
  }
  return parent.name;
}
