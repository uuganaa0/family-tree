"use client";
import { useState, useEffect } from "react";

interface User { id: string; name: string; email: string; role: string; }
interface Activity { id: string; userName: string; action: string; memberName: string; detail: string | null; createdAt: string; }

function fmt(s: string) {
  const d = new Date(s);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")} ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
}

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"users"|"log">("users");
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);

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

  const actionLabel: Record<string, string> = { create: "нэмсэн", update: "засварласан", delete: "устгасан" };
  const actionColor: Record<string, string> = { create: "#16a34a", update: "#d97706", delete: "#ef4444" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 200 }}>
      <div style={{ background: "#fff", borderRadius: 12, width: 520, maxHeight: "80vh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {(["users","log"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? "#7c3aed" : "#f1f5f9", color: tab === t ? "#fff" : "#475569" }}>
                {t === "users" ? "👥 Хэрэглэгчид" : "📋 Лог"}
              </button>
            ))}
          </div>
          <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 6, width: 30, height: 30, cursor: "pointer", fontSize: 18, color: "#64748b" }}>×</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>
          {loading && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Уншиж байна...</div>}
          {!loading && tab === "users" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {users.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{u.name}</div>
                    <div style={{ fontSize: 12, color: "#94a3b8" }}>{u.email}</div>
                  </div>
                  <select value={u.role} onChange={e => updateRole(u.id, e.target.value)} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 12, background: u.role === "admin" ? "#f3e8ff" : "#f0fdf4", color: u.role === "admin" ? "#7c3aed" : "#16a34a", cursor: "pointer" }}>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ))}
            </div>
          )}
          {!loading && tab === "log" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {activities.length === 0 && <div style={{ textAlign: "center", color: "#94a3b8", padding: 40 }}>Лог хоосон байна</div>}
              {activities.map(a => (
                <div key={a.id} style={{ padding: "8px 12px", borderRadius: 8, background: "#f8fafc", border: "1px solid #e2e8f0" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                    <span><b>{a.userName}</b> — <span style={{ color: actionColor[a.action] }}>{actionLabel[a.action]}</span> <b>{a.memberName}</b></span>
                    <span style={{ color: "#94a3b8", fontSize: 11, flexShrink: 0, marginLeft: 8 }}>{fmt(a.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
