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

  const headerBg = isDead
    ? "linear-gradient(135deg, #64748b, #475569)"
    : member.gender === "female"
      ? "linear-gradient(135deg, #ec4899, #be185d)"
      : "linear-gradient(135deg, #3b82f6, #1d4ed8)";

  return (
    <div style={{
      position: "fixed", right: 0, top: 0, bottom: 0, width: 300,
      background: "#fff", borderLeft: "1px solid var(--line)",
      boxShadow: "var(--shadow-lg)",
      display: "flex", flexDirection: "column", zIndex: 100,
      animation: "ft-slide-in 0.18s ease",
    }}>
      <div style={{ padding: "20px 18px", background: headerBg, color: "#fff", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, border: "none", background: "rgba(255,255,255,0.2)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 18, lineHeight: 1, color: "#fff", flexShrink: 0 }}>×</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.22)", fontSize: 22, flexShrink: 0 }}>
            {member.gender === "female" ? "♀" : "♂"}
          </span>
          <div style={{ flex: 1, minWidth: 0, paddingRight: 24 }}>
            {fatherName && <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)", fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fatherName}</div>}
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.01em" }}>
              {member.name}{isDead && <span style={{ opacity: 0.85, marginLeft: 5 }}>✝</span>}
            </div>
          </div>
        </div>
      </div>
      <div style={{ flex: 1, padding: 18, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
        <Row label="Хүйс" value={member.gender === "male" ? "Эрэгтэй" : member.gender === "female" ? "Эмэгтэй" : "—"} />
        {member.birthYear && <Row label="Төрсөн он" value={String(member.birthYear)} />}
        {member.deathYear && <Row label="Нас барсан он" value={String(member.deathYear)} />}
        {age !== null && <Row label={isDead ? "Насалсан" : "Нас"} value={`${age} нас`} />}
        {spouseName && <Row label="Эхнэр / Нөхөр" value={spouseName} />}
        {member.note && <Row label="Тэмдэглэл" value={member.note} />}
      </div>
      {isAdmin && (
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
          <button onClick={onEdit} className="ft-btn ft-btn--warn" style={{ flex: 1, justifyContent: "center", padding: "9px" }}>✏ Засах</button>
          <button onClick={onDelete} className="ft-btn ft-btn--danger" style={{ flex: 1, justifyContent: "center", padding: "9px" }}>× Устгах</button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 3, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 14.5, color: "var(--ink)" }}>{value}</div>
    </div>
  );
}
