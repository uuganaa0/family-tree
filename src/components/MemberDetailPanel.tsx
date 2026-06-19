"use client";
import { useState } from "react";
import type { Member } from "./FamilyTree";

interface Props {
  member: Member;
  fatherName: string;
  spouses?: { name: string; status: string | null }[];
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function MemberDetailPanel({ member, fatherName, spouses = [], canEdit, canDelete, onEdit, onDelete, onClose }: Props) {
  const [zoom, setZoom] = useState(false);
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
    <>
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 400,
        background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, animation: "ft-fade-in 0.15s ease-out",
      }}
    >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 360, maxWidth: "100%", maxHeight: "88vh",
        background: "#fff", borderRadius: 18, overflow: "hidden",
        boxShadow: "0 24px 70px rgba(0,0,0,0.35)",
        display: "flex", flexDirection: "column",
        animation: "ft-pop-in 0.16s ease",
      }}>
      <div style={{ padding: "22px 20px", background: headerBg, color: "#fff", position: "relative" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, border: "none", background: "rgba(255,255,255,0.2)", borderRadius: 8, width: 28, height: 28, cursor: "pointer", fontSize: 18, lineHeight: 1, color: "#fff", flexShrink: 0 }}>×</button>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {member.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={member.photo}
              alt={member.name}
              onClick={() => setZoom(true)}
              title="Томруулж харах"
              style={{ width: 52, height: 52, borderRadius: 14, objectFit: "cover", flexShrink: 0, border: "2px solid rgba(255,255,255,0.5)", cursor: "zoom-in" }}
            />
          ) : (
            <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 12, background: "rgba(255,255,255,0.22)", fontSize: 22, flexShrink: 0 }}>
              {member.gender === "female" ? "♀" : "♂"}
            </span>
          )}
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
        {member.relation === "adopted" && <Row label="Холбоос" value="Өргөмөл хүүхэд" />}
        {member.relation === "step" && <Row label="Холбоос" value="Дагавар хүүхэд" />}
        {spouses.map((s, i) => (
          <Row key={i} label={spouses.length > 1 ? `Хань ${i + 1}` : "Эхнэр / Нөхөр"}
            value={s.status === "divorced" ? `${s.name} (салсан 💔)` : s.name} />
        ))}
        {member.note && <Row label="Тэмдэглэл" value={member.note} />}
      </div>
      {(canEdit || canDelete) && (
        <div style={{ padding: "14px 18px", borderTop: "1px solid var(--line)", display: "flex", gap: 8 }}>
          {canEdit && <button onClick={onEdit} className="ft-btn ft-btn--warn" style={{ flex: 1, justifyContent: "center", padding: "9px" }}>✏ Засах</button>}
          {canDelete && <button onClick={onDelete} className="ft-btn ft-btn--danger" style={{ flex: 1, justifyContent: "center", padding: "9px" }}>× Устгах</button>}
        </div>
      )}
    </div>
    </div>

    {/* Зураг томруулж харах — admin болон viewer хоёуланд */}
    {zoom && member.photo && (
      <div
        onClick={() => setZoom(false)}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(15,23,42,0.86)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24, cursor: "zoom-out", animation: "ft-fade-in 0.15s ease-out",
        }}
      >
        <button
          onClick={() => setZoom(false)}
          aria-label="Хаах"
          style={{ position: "absolute", top: 18, right: 20, width: 40, height: 40, borderRadius: 12, border: "none", background: "rgba(255,255,255,0.16)", color: "#fff", fontSize: 22, cursor: "pointer" }}
        >
          ✕
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={member.photo}
          alt={member.name}
          onClick={(e) => e.stopPropagation()}
          style={{ maxWidth: "92vw", maxHeight: "86vh", borderRadius: 16, objectFit: "contain", boxShadow: "0 24px 70px rgba(0,0,0,0.5)", cursor: "default" }}
        />
      </div>
    )}
    </>
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
