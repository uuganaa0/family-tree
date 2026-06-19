"use client";
import { useState, useEffect } from "react";

interface User { id: string; name: string; email: string; role: string; }
interface Activity { id: string; userName: string; action: string; memberName: string; detail: string | null; createdAt: string; }

function fmt(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

const ROLE_META: Record<string, { label: string; bg: string; fg: string }> = {
  admin: { label: "Admin", bg: "#f3e8ff", fg: "#7c3aed" },
  "sub-admin": { label: "Sub-admin", bg: "#e0f2fe", fg: "#0369a1" },
  viewer: { label: "Viewer", bg: "#f0fdf4", fg: "#16a34a" },
};
function roleMeta(role: string) { return ROLE_META[role] ?? ROLE_META.viewer; }

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"users"|"log">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ name: "", email: "", password: "", role: "viewer" });
  const [editError, setEditError] = useState("");
  const [editLoading, setEditLoading] = useState(false);

  function openEdit(u: User) {
    setEditUser(u);
    setEditForm({ name: u.name, email: u.email, password: "", role: u.role });
    setEditError("");
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    setEditError("");
    setEditLoading(true);
    const body: Record<string, string> = { name: editForm.name, email: editForm.email, role: editForm.role };
    if (editForm.password) body.password = editForm.password;
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setEditLoading(false);
    if (!res.ok) { setEditError(data.error ?? "Алдаа гарлаа"); return; }
    setUsers(prev => prev.map(u => u.id === editUser.id ? { ...u, name: editForm.name, email: editForm.email.trim().toLowerCase(), role: editForm.role } : u));
    setEditUser(null);
  }

  useEffect(() => {
    setLoading(true);
    const url = tab === "users" ? "/api/users" : "/api/activity";
    fetch(url).then(r => r.json()).then(d => {
      if (tab === "users") setUsers(d); else setActivities(d);
      setLoading(false);
    });
  }, [tab]);

  async function updateRole(id: string, role: string) {
    await fetch(`/api/users/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ role }) });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
  }

  async function deleteUser(id: string) {
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      setUsers(prev => prev.filter(u => u.id !== id));
    }
    setDeleteUserId(null);
  }

  const deleteTarget = users.find(u => u.id === deleteUserId);
  const actionLabel: Record<string, string> = { create: "нэмсэн", update: "засварласан", delete: "устгасан" };
  const actionColor: Record<string, string> = { create: "#16a34a", update: "#d97706", delete: "#ef4444" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: 14, width: 540, maxHeight: "82vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
        {/* Header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fafafa" }}>
          <div style={{ display: "flex", gap: 6 }}>
            {(["users","log"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: "6px 16px", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600,
                background: tab === t ? "#7c3aed" : "transparent",
                color: tab === t ? "#fff" : "#64748b",
                transition: "all 0.15s",
              }}>
                {t === "users" ? "👥 Хэрэглэгчид" : "📋 Лог"}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 18, color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Уншиж байна...</div>}

          {!loading && tab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {users.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Хэрэглэгч байхгүй</div>}
              {users.map(u => (
                <div key={u.id} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", borderRadius: 10,
                  background: "#f8fafc", border: "1px solid #e2e8f0",
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: roleMeta(u.role).bg,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700,
                    color: roleMeta(u.role).fg,
                  }}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e293b" }}>{u.name}</div>
                    <div style={{ fontSize: 11, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                  </div>
                  <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{
                    border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12,
                    background: roleMeta(u.role).bg,
                    color: roleMeta(u.role).fg,
                    cursor: "pointer", fontWeight: 600,
                  }}>
                    <option value="viewer">Viewer</option>
                    <option value="sub-admin">Sub-admin</option>
                    <option value="admin">Admin</option>
                  </select>
                  <button
                    onClick={() => openEdit(u)}
                    title="Засах"
                    style={{
                      border: "none", borderRadius: 7, width: 30, height: 30,
                      background: "#fef3c7", color: "#d97706",
                      cursor: "pointer", fontSize: 14, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ✏
                  </button>
                  <button
                    onClick={() => setDeleteUserId(u.id)}
                    title="Устгах"
                    style={{
                      border: "none", borderRadius: 7, width: 30, height: 30,
                      background: "#fee2e2", color: "#ef4444",
                      cursor: "pointer", fontSize: 14, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {!loading && tab === "log" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {activities.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Лог хоосон байна</div>}
              {activities.map(a => (
                <div key={a.id} style={{ padding: "9px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, alignItems: "center" }}>
                    <span>
                      <b>{a.userName}</b>
                      {" — "}
                      <span style={{ color: actionColor[a.action], fontWeight: 600 }}>{actionLabel[a.action]}</span>
                      {" "}
                      <b>{a.memberName}</b>
                    </span>
                    <span style={{ color: "#94a3b8", fontSize: 11, flexShrink: 0, marginLeft: 12 }}>{fmt(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit user */}
      {editUser && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 26, width: 340, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: "#1e293b" }}>Хэрэглэгч засах</div>
            {editError && (
              <div style={{ fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: "8px 12px", borderRadius: 8, marginBottom: 12 }}>{editError}</div>
            )}
            <form onSubmit={saveEdit} style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              <input required placeholder="Нэр" value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 11px", fontSize: 13 }} />
              <input required type="email" placeholder="Email" value={editForm.email}
                onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 11px", fontSize: 13 }} />
              <input type="password" placeholder="Шинэ нууц үг (хоосон бол хэвээр)" value={editForm.password}
                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 11px", fontSize: 13 }} />
              <select value={editForm.role} onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                style={{ border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 11px", fontSize: 13 }}>
                <option value="viewer">Viewer — зөвхөн харах</option>
                <option value="sub-admin">Sub-admin — засна (устгахгүй)</option>
                <option value="admin">Admin — бүх эрх</option>
              </select>
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <button type="submit" disabled={editLoading} style={{ flex: 1, background: "#7c3aed", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  {editLoading ? "Хадгалж байна..." : "Хадгалах"}
                </button>
                <button type="button" onClick={() => setEditUser(null)} style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, cursor: "pointer" }}>
                  Болих
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteUserId && deleteTarget && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 300 }}>
          <div style={{ background: "#fff", borderRadius: 12, padding: 28, width: 320, boxShadow: "0 8px 32px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#1e293b" }}>Хэрэглэгч устгах уу?</div>
            <div style={{ fontSize: 14, color: "#64748b", marginBottom: 20 }}>
              <b>{deleteTarget.name}</b> ({deleteTarget.email})-г устгах гэж байна.
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => deleteUser(deleteUserId)} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                Устгах
              </button>
              <button onClick={() => setDeleteUserId(null)} style={{ flex: 1, background: "#f1f5f9", color: "#475569", border: "none", borderRadius: 8, padding: "9px", fontSize: 13, cursor: "pointer" }}>
                Болих
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
