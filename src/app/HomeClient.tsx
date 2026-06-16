"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import AddMemberModal from "@/components/AddMemberModal";
import EditMemberModal from "@/components/EditMemberModal";
import MemberDetailPanel from "@/components/MemberDetailPanel";
import AdminPanel from "@/components/AdminPanel";
import type { Member } from "@/components/FamilyTree";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"), { ssr: false });

type AddMode =
  | { type: "root" }
  | { type: "child"; parentId: string; parentName: string }
  | { type: "spouse"; spouseForId: string; spouseForName: string };

interface Props {
  initialMembers: Member[];
  user: { name: string; email: string; role: string } | null;
}

export default function HomeClient({ initialMembers, user }: Props) {
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [addModal, setAddModal] = useState<{ open: false } | { open: true; mode: AddMode }>({ open: false });
  const [editMember, setEditMember] = useState<Member | null>(null);
  const [userModal, setUserModal] = useState(false);
  const [userForm, setUserForm] = useState({ name: "", email: "", password: "", role: "viewer" });
  const [userError, setUserError] = useState("");
  const [userLoading, setUserLoading] = useState(false);

  // New state
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const [adminPanel, setAdminPanel] = useState(false);

  function getFatherName(m: Member): string {
    if (!m.parentId) return "";
    const parent = members.find(x => x.id === m.parentId);
    if (!parent) return "";
    if (parent.gender === "male" || !parent.gender) return parent.name;
    if (parent.spouseId) {
      const sp = members.find(x => x.id === parent.spouseId);
      if (sp && (sp.gender === "male" || !sp.gender)) return sp.name;
    }
    return parent.name;
  }

  const searchResults = searchQuery.trim()
    ? members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setUserError("");
    setUserLoading(true);
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    const data = await res.json();
    setUserLoading(false);
    if (!res.ok) { setUserError(data.error); return; }
    setUserModal(false);
    setUserForm({ name: "", email: "", password: "", role: "viewer" });
  }

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
            {user.role === "admin" && (
              <>
                <button onClick={handleAddRoot} style={{
                  fontSize: 12, background: "#16a34a", color: "#fff",
                  border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                }}>
                  + Үндэс нэмэх
                </button>
                <button onClick={() => setUserModal(true)} style={{
                  fontSize: 12, background: "#7c3aed", color: "#fff",
                  border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                }}>
                  + Хэрэглэгч
                </button>
              </>
            )}

            {/* Search - visible to all logged in users */}
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Хайх..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onFocus={() => {}}
                onBlur={() => setTimeout(() => setSearchQuery(""), 200)}
                style={{ fontSize: 12, border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 10px", width: 140, outline: "none" }}
              />
              {searchResults.length > 0 && (
                <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 300, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, boxShadow: "0 4px 16px rgba(0,0,0,0.1)", minWidth: 180, marginTop: 2 }}>
                  {searchResults.map(m => (
                    <div key={m.id} onMouseDown={() => { setFocusId(m.id); setSelectedMember(m); setSearchQuery(""); setTimeout(() => setFocusId(null), 1000); }}
                      style={{ padding: "8px 12px", fontSize: 13, cursor: "pointer", borderBottom: "1px solid #f1f5f9" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f8fafc")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      {m.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user.role === "admin" && (
              <button onClick={() => setAdminPanel(true)} style={{ fontSize: 12, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 6, padding: "4px 10px", cursor: "pointer" }}>
                ⚙ Admin
              </button>
            )}

            <span style={{ fontSize: 12, color: "#94a3b8", marginLeft: "auto" }}>
              {members.length} гишүүн &nbsp;·&nbsp; {user.name}
            </span>
            <button onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
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
      {user?.role === "admin" && (
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
            isAuthenticated={user?.role === "admin"}
            onAddChild={handleAddChild}
            onAddSpouse={handleAddSpouse}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddRoot={handleAddRoot}
            onNodeClick={(m) => setSelectedMember(m)}
            focusId={focusId}
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

      {userModal && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 320 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Шинэ хэрэглэгч үүсгэх</h2>
            {userError && (
              <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 6, marginBottom: 12 }}>
                {userError}
              </div>
            )}
            <form onSubmit={handleCreateUser} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <input required placeholder="Нэр" value={userForm.name}
                onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
              <input required type="email" placeholder="Email" value={userForm.email}
                onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
              <input required type="password" placeholder="Нууц үг" value={userForm.password}
                onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 13 }} />
              <select value={userForm.role} onChange={e => setUserForm({ ...userForm, role: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 6, padding: "8px 10px", fontSize: 13 }}>
                <option value="viewer">Viewer — зөвхөн харах</option>
                <option value="admin">Admin — засах эрхтэй</option>
              </select>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={userLoading} style={{
                  flex: 1, background: "#7c3aed", color: "#fff", border: "none",
                  borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer",
                }}>
                  {userLoading ? "Үүсгэж байна..." : "Үүсгэх"}
                </button>
                <button type="button" onClick={() => { setUserModal(false); setUserError(""); }} style={{
                  flex: 1, background: "#f1f5f9", color: "#475569", border: "none",
                  borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer",
                }}>
                  Болих
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedMember && (
        <MemberDetailPanel
          member={selectedMember}
          fatherName={getFatherName(selectedMember)}
          isAdmin={user?.role === "admin"}
          onEdit={() => { handleEdit(selectedMember); setSelectedMember(null); }}
          onDelete={() => { handleDelete(selectedMember.id, selectedMember.name); setSelectedMember(null); }}
          onClose={() => setSelectedMember(null)}
        />
      )}
      {adminPanel && <AdminPanel onClose={() => setAdminPanel(false)} />}
    </div>
  );
}
