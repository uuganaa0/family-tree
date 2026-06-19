"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import AddMemberModal from "@/components/AddMemberModal";
import EditMemberModal from "@/components/EditMemberModal";
import MemberDetailPanel from "@/components/MemberDetailPanel";
import AdminPanel from "@/components/AdminPanel";
import type { Member } from "@/components/FamilyTree";
import { getFatherName as getFatherNameUtil } from "@/lib/family";

const FamilyTree = dynamic(() => import("@/components/FamilyTree"), { ssr: false });

type AddMode =
  | { type: "root" }
  | { type: "child"; parentId: string; parentName: string }
  | { type: "parent"; childForId: string; childForName: string }
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [adminPanel, setAdminPanel] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const memberMap = new Map(members.map(m => [m.id, m]));

  function getFatherName(m: Member): string {
    return getFatherNameUtil(m, memberMap);
  }

  function getSpouseName(m: Member): string {
    if (!m.spouseId) return "";
    return memberMap.get(m.spouseId)?.name ?? "";
  }

  const searchResults = searchQuery.trim()
    ? members.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
    : [];

  // Escape товч → бүх panel/modal хаах
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (deleteConfirm) { setDeleteConfirm(null); return; }
      if (selectedMember) { setSelectedMember(null); return; }
      if (adminPanel) { setAdminPanel(false); return; }
      if (addModal.open) { setAddModal({ open: false }); return; }
      if (editMember) { setEditMember(null); return; }
      if (userModal) { setUserModal(false); return; }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [deleteConfirm, selectedMember, adminPanel, addModal, editMember, userModal]);

  // Search dropdown-г гадна дарахад хаах
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

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

  const handleAddParent = useCallback((childForId: string, childForName: string) => {
    setAddModal({ open: true, mode: { type: "parent", childForId, childForName } });
  }, []);

  const handleAddRoot = useCallback(() => {
    setAddModal({ open: true, mode: { type: "root" } });
  }, []);

  const handleEdit = useCallback((member: Member) => {
    setEditMember(member);
  }, []);

  async function handleDelete(id: string, name: string) {
    setDeleteConfirm({ id, name });
  }

  async function confirmDelete() {
    if (!deleteConfirm) return;
    await fetch(`/api/members/${deleteConfirm.id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    setSelectedMember(null);
    await refreshMembers();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* Header */}
      <div className="ft-bar">
        <span className="ft-brand">
          <span className="ft-brand-mark">🌳</span>
          Ургийн Мод
        </span>
        {user ? (
          <>
            {user.role === "admin" && (
              <>
                <button onClick={handleAddRoot} className="ft-btn ft-btn--primary">
                  + Үндэс нэмэх
                </button>
                <button onClick={() => setUserModal(true)} className="ft-btn ft-btn--accent">
                  + Хэрэглэгч
                </button>
              </>
            )}

            {/* Search */}
            <div ref={searchRef} style={{ position: "relative" }}>
              <input
                type="text"
                className="ft-input"
                placeholder="🔍  Хайх..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                style={{ width: 168 }}
              />
              {searchOpen && searchResults.length > 0 && (
                <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 300, background: "#fff", border: "1px solid var(--line)", borderRadius: 10, boxShadow: "var(--shadow-md)", minWidth: 200, overflow: "hidden", animation: "ft-pop-in 0.12s ease" }}>
                  {searchResults.map(m => (
                    <div key={m.id}
                      onMouseDown={() => { setFocusId(m.id); setSelectedMember(m); setSearchQuery(""); setSearchOpen(false); setTimeout(() => setFocusId(null), 1000); }}
                      style={{ padding: "9px 13px", fontSize: 13, cursor: "pointer" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "#f4f7fb")}
                      onMouseLeave={e => (e.currentTarget.style.background = "#fff")}>
                      {m.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {user.role === "admin" && (
              <button onClick={() => setAdminPanel(true)} className="ft-btn ft-btn--ghost">
                ⚙ Admin
              </button>
            )}

            <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ background: "#f1f5f9", color: "var(--ink-soft)", padding: "3px 9px", borderRadius: 999, fontWeight: 600 }}>{members.length} гишүүн</span>
              <span style={{ fontWeight: 600, color: "var(--ink-soft)" }}>{user.name}</span>
            </span>
            <button onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              window.location.href = "/";
            }} className="ft-btn ft-btn--ghost">
              Гарах
            </button>
          </>
        ) : (
          <>
            <span style={{ fontSize: 12.5, color: "var(--muted)", marginLeft: "auto" }}>
              <span style={{ background: "#f1f5f9", color: "var(--ink-soft)", padding: "3px 9px", borderRadius: 999, fontWeight: 600 }}>{members.length} гишүүн</span>
              <span style={{ margin: "0 10px" }}>scroll=zoom · drag=хөдөлгөх</span>
            </span>
            <a href="/login" className="ft-link">Нэвтрэх</a>
            <a href="/register" className="ft-btn ft-btn--primary" style={{ textDecoration: "none" }}>Бүртгүүлэх</a>
          </>
        )}
      </div>

      {/* Legend */}
      {user?.role === "admin" && (
        <div style={{
          display: "flex", gap: 18, padding: "6px 18px",
          background: "rgba(244,247,251,0.7)", borderBottom: "1px solid var(--line)",
          fontSize: 11.5, color: "var(--ink-soft)", flexShrink: 0,
        }}>
          <span><span style={{ color: "#22c55e", fontWeight: 700 }}>+</span> Хүүхэд</span>
          <span><span style={{ color: "#6366f1", fontWeight: 700 }}>↑</span> Аав/Ээж</span>
          <span><span style={{ color: "#ec4899" }}>❤</span> Эхнэр/Нөхөр</span>
          <span><span style={{ color: "#f59e0b" }}>✏</span> Засах</span>
          <span><span style={{ color: "#ef4444", fontWeight: 700 }}>×</span> Устгах</span>
          <span style={{ color: "#7c3aed" }}>┄ Өргөмөл/Дагавар</span>
          <span>💔 Салсан</span>
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
            onAddParent={handleAddParent}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onAddRoot={handleAddRoot}
            onNodeClick={(m) => setSelectedMember(m)}
            focusId={focusId}
          />
        ) : (
          <GuestLanding />
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
          spouseName={getSpouseName(selectedMember)}
          isAdmin={user?.role === "admin"}
          onEdit={() => { handleEdit(selectedMember); setSelectedMember(null); }}
          onDelete={() => { handleDelete(selectedMember.id, selectedMember.name); setSelectedMember(null); }}
          onClose={() => setSelectedMember(null)}
        />
      )}
      {adminPanel && <AdminPanel onClose={() => setAdminPanel(false)} />}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>Устгах уу?</div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
              <b>&ldquo;{deleteConfirm.name}&rdquo;</b>-г устгасан үед хүүхдүүд нь эцэг эхгүй болно.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={confirmDelete} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Устгах
              </button>
              <button onClick={() => setDeleteConfirm(null)} style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, cursor: "pointer" }}>
                Болих
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GuestLanding() {
  const [tab, setTab] = useState<"login" | "register">("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const url = tab === "login" ? "/api/auth/login" : "/api/auth/register";
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    window.location.reload();
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10,
    padding: "11px 14px", fontSize: 14, outline: "none", boxSizing: "border-box",
  };

  return (
    <div style={{
      display: "flex", height: "100%",
      background: "linear-gradient(135deg, #f0f9ff 0%, #e8f5e9 100%)",
    }}>
      {/* Left brand panel */}
      <div style={{
        flex: 1, position: "relative", overflow: "hidden",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 32px",
        background: "linear-gradient(155deg, #0f3d3a 0%, #134e4a 45%, #0f766e 100%)",
        color: "#fff",
      }}>
        {/* decorative glow */}
        <div style={{ position: "absolute", top: "-15%", left: "-10%", width: 360, height: 360, borderRadius: "50%", background: "radial-gradient(circle, rgba(20,184,166,0.35), transparent 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-20%", right: "-10%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(56,189,248,0.18), transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", display: "grid", placeItems: "center", width: 96, height: 96, borderRadius: 28, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", fontSize: 52, marginBottom: 22, boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>🌳</div>
        <div style={{ position: "relative", fontSize: 32, fontWeight: 800, marginBottom: 12, textAlign: "center", letterSpacing: "-0.02em" }}>Ургийн Мод</div>
        <div style={{ position: "relative", fontSize: 15, color: "rgba(255,255,255,0.72)", textAlign: "center", maxWidth: 290, lineHeight: 1.7 }}>
          Гэр бүлийн түүхийг хадгалж, үеийн үед дамжуулж ирэх платформ
        </div>
        <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: 10, marginTop: 38, width: "100%", maxWidth: 280 }}>
          {[
            { icon: "🔗", text: "Үеийн холбоос харуулах" },
            { icon: "🔍", text: "Хурдан хайлт" },
            { icon: "📥", text: "PNG татаж авах" },
          ].map(f => (
            <div key={f.icon} style={{ display: "flex", alignItems: "center", gap: 13, fontSize: 14, color: "rgba(255,255,255,0.92)", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, padding: "11px 15px" }}>
              <span style={{ fontSize: 18 }}>{f.icon}</span>
              {f.text}
            </div>
          ))}
        </div>
      </div>

      {/* Right form panel */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 32px",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <div style={{ marginBottom: 22 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", letterSpacing: "-0.02em" }}>Тавтай морил</div>
            <div style={{ fontSize: 14, color: "var(--muted)", marginTop: 4 }}>Үргэлжлүүлэхийн тулд нэвтэрнэ үү</div>
          </div>
          {/* Tab switcher */}
          <div style={{ display: "flex", background: "#f1f5f9", borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {(["login", "register"] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(""); }} style={{
                flex: 1, padding: "9px", borderRadius: 9, border: "none", cursor: "pointer",
                fontSize: 14, fontWeight: 700,
                background: tab === t ? "#fff" : "transparent",
                color: tab === t ? "#1e293b" : "#94a3b8",
                boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                transition: "all 0.15s",
              }}>
                {t === "login" ? "Нэвтрэх" : "Бүртгүүлэх"}
              </button>
            ))}
          </div>

          {error && (
            <div style={{ marginBottom: 16, fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {tab === "register" && (
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Нэр</label>
                <input
                  type="text" required value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Батбаяр" style={inputStyle}
                  onFocus={e => e.currentTarget.style.borderColor = "#0f766e"}
                  onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
                />
              </div>
            )}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="example@mail.com" style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = "#0f766e"}
                onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Нууц үг</label>
              <input
                type="password" required minLength={tab === "register" ? 6 : undefined}
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder={tab === "register" ? "6+ тэмдэгт" : "••••••••"} style={inputStyle}
                onFocus={e => e.currentTarget.style.borderColor = "#0f766e"}
                onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "13px", borderRadius: 10, border: "none",
                background: loading ? "#5eead4" : "#0f766e",
                color: "#fff", fontSize: 15, fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer", marginTop: 4,
              }}
            >
              {loading
                ? (tab === "login" ? "Нэвтэрч байна..." : "Бүртгэж байна...")
                : (tab === "login" ? "Нэвтрэх" : "Бүртгүүлэх")}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
