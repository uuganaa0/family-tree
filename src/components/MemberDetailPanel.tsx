"use client";
import type { Member } from "./FamilyTree";

interface Props {
  member: Member;
  fatherName: string;
  spouseName?: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function MemberDetailPanel({ member, fatherName, spouseName, isAdmin, onEdit, onDelete, onClose }: Props) {
  const isDead = !!member.deathYear;
  const currentYear = new Date().getFullYear();
  const age = member.birthYear
    ? (isDead ? member.deathYear! : currentYear) - member.birthYear
    : null;

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 280,
      background: "#fff", borderLeft: "1px solid #e2e8f0",
      boxShadow: "-4px 0 20px rgba(0,0,0,0.08)",
      display: "flex", flexDirection: "column", zIndex: 100,
    }}>
      <div style={{ padding: "14px 16px", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22 }}>{member.gender === "female" ? "♀" : "♂"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {fatherName && <div style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fatherName}</div>}
          <div style={{ fontSize: 15, fontWeight: 700, color: "#1e293b" }}>
            {member.name}{isDead && <span style={{ color: "#94a3b8", marginLeft: 4 }}>✝</span>}
          </div>
        </div>
        <button onClick={onClose} style={{ border: "none", background: "#f1f5f9", borderRadius: 6, width: 28, height: 28, cursor: "pointer", fontSize: 16, color: "#64748b", flexShrink: 0 }}>×</button>
      </div>
      <div style={{ flex: 1, padding: 16, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        <Row label="Хүйс" value={member.gender === "male" ? "Эрэгтэй" : member.gender === "female" ? "Эмэгтэй" : "—"} />
        {member.birthYear && <Row label="Төрсөн он" value={String(member.birthYear)} />}
        {member.deathYear && <Row label="Нас барсан он" value={String(member.deathYear)} />}
        {age !== null && <Row label={isDead ? "Насалсан" : "Нас"} value={`${age} нас`} />}
        {spouseName && <Row label="Эхнэр / Нөхөр" value={spouseName} />}
        {member.note && <Row label="Тэмдэглэл" value={member.note} />}
      </div>
      {isAdmin && (
        <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", display: "flex", gap: 8 }}>
          <button onClick={onEdit} style={{ flex: 1, background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer" }}>✏ Засах</button>
          <button onClick={onDelete} style={{ flex: 1, background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, padding: "8px", fontSize: 13, cursor: "pointer" }}>× Устгах</button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 14, color: "#1e293b" }}>{value}</div>
    </div>
  );
}
