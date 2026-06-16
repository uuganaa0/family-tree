"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import AddMemberModal from "@/components/AddMemberModal";
import EditMemberModal from "@/components/EditMemberModal";
import type { Member } from "@/components/FamilyTree";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"), { ssr: false });

type AddMode =
  | { type: "root" }
  | { type: "child"; parentId: string; parentName: string }
  | { type: "spouse"; spouseForId: string; spouseForName: string };

interface Props {
  initialMembers: Member[];
  user: { name: string; email: string } | null;
}

export default function HomeClient({ initialMembers, user }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [addModal, setAddModal] = useState<{ open: false } | { open: true; mode: AddMode }>({ open: false });
  const [editMember, setEditMember] = useState<Member | null>(null);

  async function refreshMembers() {
    const res = await fetch("/api/members", { cache: "no-store" });
    setMembers(await res.json());
  }

  const handleAddChild = useCallback((parentId: string, parentName: string) => {
    setAddModal({ open: true, mode: { type: "child", parentId, parentName } });
  }, []);

  const handleAddSpouse = useCallback((spouseForId: string, spouseForName: string) => {
    setAddModal({ open: true, mode: { type: "spouse", spouseForId, spouseForName } });
  }, []);

  const handleAddRoot = useCallback(() => {
    setAddModal({ open: true, mode: { type: "root" } });
  }, []);

  const handleEdit = useCallback((member: Member) => {
    setEditMember(member);
  }, []);

  async function handleDelete(id: string, name: string) {
    if (!confirm(`"${name}"-г устгах уу?`)) return;
    await fetch(`/api/members/${id}`, { method: "DELETE" });
    await refreshMembers();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", gap: 12,
        padding: "6px 16px", background: "#fff",
        borderBottom: "1px solid #e2e8f0", flexShrink: 0,
      }}>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#1e293b" }}>🌳 Ургийн Мод</span>
        {user ? (
          <>
            <button onClick={handleAddRoot} style={{
              fontSize: 12, background: "#16a34a", color: "#fff",
              border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer",
            }}>
              + Үндэс нэмэх
            </button>
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
              {members.length} гишүүн &nbsp;·&nbsp; {user.name}
            </span>
            <button onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.reload();
            }} style={{
              fontSize: 12, background: "#f1f5f9", color: "#475569",
              border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer",
            }}>
              Гарах
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
              {members.length} гишүүн &nbsp;·&nbsp; scroll=zoom · drag=хөдөлгөх
            </span>
            <a href="/login" style={{ fontSize: 12, color: "#2563eb" }}>Нэвтрэх</a>
            <a href="/register" style={{
              fontSize: 12, background: "#2563eb", color: "#fff",
              borderRadius: 6, padding: "4px 10px", textDecoration: "none",
            }}>Бүртгүүлэх</a>
          </>
        )}
      </div>

      {/* Legend */}
      {user && (
        <div style={{
          display: "flex", gap: 16, padding: "4px 16px",
          background: "#f8fafc", borderBottom: "1px solid #e2e8f0",
          fontSize: 11, color: "#64748b", flexShrink: 0,
        }}>
          <span><span style={{ color: "#22c55e", fontWeight: 700 }}>+</span> Хүүхэд</span>
          <span><span style={{ color: "#ec4899" }}>❤</span> Эхнэр/Нөхөр</span>
          <span><span style={{ color: "#f59e0b" }}>✏</span> Засах</span>
          <span><span style={{ color: "#ef4444", fontWeight: 700 }}>×</span> Устгах</span>
          <span style={{ marginLeft: "auto" }}>Box-г чирж байршуулна</span>
        </div>
      )}

      {/* Canvas */}
      <div style={{ flex: 1, overflow: "hidden", minHeight: 0 }}>
        {user ? (
          <FamilyTree
            members={members}
            isAuthenticated={true}
            onAddChild={handleAddChild}
            onAddSpouse={handleAddSpouse}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddRoot={handleAddRoot}
          />
        ) : (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: 16,
            background: "linear-gradient(135deg, #f0fdf4 0%, #eff6ff 100%)",
          }}>
            <div style={{ fontSize: 64 }}>🌳</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#1e293b" }}>
              Гэр бүлийн ургийн мод
            </div>
            <div style={{ fontSize: 15, color: "#64748b", textAlign: "center", maxWidth: 320 }}>
              Ургийн модыг харах болон засварлахын тулд нэвтэрнэ үү
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
              <a href="/login" style={{
                background: "#2563eb", color: "#fff", borderRadius: 8,
                padding: "10px 28px", textDecoration: "none", fontWeight: 600, fontSize: 15,
              }}>
                Нэвтрэх
              </a>
            </div>
          </div>
        )}
      </div>

      {addModal.open && (
        <AddMemberModal
          mode={addModal.mode}
          onClose={() => setAddModal({ open: false })}
          onSaved={refreshMembers}
        />
      )}

      {editMember && (
        <EditMemberModal
          member={editMember}
          onClose={() => setEditMember(null)}
          onSaved={refreshMembers}
        />
      )}
    </div>
  );
}
