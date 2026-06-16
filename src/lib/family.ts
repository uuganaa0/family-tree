export interface MemberLike {
  id: string;
  name: string;
  gender?: string | null;
  parentId?: string | null;
  spouseId?: string | null;
}

export function getFatherName(m: MemberLike, memberMap: Map<string, MemberLike>): string {
  if (!m.parentId) return "";
  const parent = memberMap.get(m.parentId);
  if (!parent) return "";
  if (parent.gender === "male" || !parent.gender) return parent.name;
  if (parent.spouseId) {
    const spouse = memberMap.get(parent.spouseId);
    if (spouse && (spouse.gender === "male" || !spouse.gender)) return spouse.name;
  }
  return parent.name;
}
