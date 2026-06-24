// Эрхийн нэг эх сурвалж — бүх API route болон client gating энд тулгуурлана.
// admin = бүх эрх, sub-admin = засна (устгахгүй), viewer = зөвхөн харах.

export const ROLES = ["admin", "sub-admin", "viewer"] as const;
export type Role = (typeof ROLES)[number];

export function isValidRole(role: unknown): role is Role {
  return typeof role === "string" && (ROLES as readonly string[]).includes(role);
}

// Засах эрх (гишүүн/гэрлэлт нэмэх, өөрчлөх)
export function canEdit(role?: string | null): boolean {
  return role === "admin" || role === "sub-admin";
}

// Устгах эрх (зөвхөн admin)
export function canDelete(role?: string | null): boolean {
  return role === "admin";
}

// Хэрэглэгч/систем удирдах эрх (зөвхөн admin)
export function isAdmin(role?: string | null): boolean {
  return role === "admin";
}

// Дэлгэцэнд role харуулах шошго + өнгө
export const ROLE_META: Record<string, { label: string; bg: string; fg: string }> = {
  admin: { label: "Admin", bg: "#f3e8ff", fg: "#7c3aed" },
  "sub-admin": { label: "Sub-admin", bg: "#e0f2fe", fg: "#0369a1" },
  viewer: { label: "Viewer", bg: "#f0fdf4", fg: "#16a34a" },
};

export function roleMeta(role: string) {
  return ROLE_META[role] ?? ROLE_META.viewer;
}
