"use client";

import { useEffect, useRef, useState } from "react";
import type { Member } from "./FamilyTree";
import { compressImageToDataUrl } from "@/lib/image";

interface Props {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

// ── Дотоод загвар (inline — энэ төсөлд Tailwind utility ажиллахгүй) ──
const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: 13,
  fontWeight: 600,
  color: "var(--ink-soft)",
  marginBottom: 7,
};

const fieldStyle: React.CSSProperties = {
  width: "100%",
  fontSize: 15,
  padding: "11px 14px",
};

export default function EditMemberModal({ member, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: member.name,
    birthYear: member.birthYear?.toString() ?? "",
    deathYear: member.deathYear?.toString() ?? "",
    gender: member.gender ?? "",
    note: member.note ?? "",
    photo: member.photo ?? "",
    relation: member.relation ?? "",
    spouseStatus: member.spouseStatus ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onPickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // ижил файлыг дахин сонгох боломжтой байх
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Зураг файл сонгоно уу");
      return;
    }
    setError("");
    setPhotoBusy(true);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setForm((f) => ({ ...f, photo: dataUrl }));
    } catch {
      setError("Зураг боловсруулахад алдаа гарлаа");
    } finally {
      setPhotoBusy(false);
    }
  }

  // Modal нээлттэй үед background scroll-ийг түгжих
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/members/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) { setError(data.error ?? "Хадгалахад алдаа гарлаа"); return; }
    onSaved();
    onClose();
  }

  // Сонгох товчны загвар
  function chip(active: boolean): React.CSSProperties {
    return {
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      padding: "11px 8px",
      fontSize: 13.5,
      fontWeight: 600,
      borderRadius: 10,
      border: `1.5px solid ${active ? "var(--brand)" : "var(--line)"}`,
      background: active ? "color-mix(in srgb, var(--brand) 10%, white)" : "#fff",
      color: active ? "var(--brand-dark)" : "var(--ink-soft)",
      cursor: "pointer",
      transition: "border-color 0.15s ease, background 0.15s ease, color 0.15s ease",
    };
  }

  return (
    <div className="ft-modal-overlay" onClick={onClose}>
      <div
        className="ft-modal-card"
        role="dialog"
        aria-modal="true"
        aria-label="Мэдээлэл засах"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — teal brand band + чимэглэлийн гэрэлтүүлэг */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 16,
            overflow: "hidden",
            padding: "22px 26px",
            background:
              "linear-gradient(145deg, var(--brand-light) 0%, var(--brand) 55%, var(--brand-dark) 100%)",
            color: "#fff",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-70%",
              right: "-6%",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(255,255,255,0.22), transparent 70%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "relative",
              display: "grid",
              placeItems: "center",
              width: 54,
              height: 54,
              flexShrink: 0,
              borderRadius: 16,
              fontSize: 28,
              background: "rgba(255,255,255,0.18)",
              border: "1px solid rgba(255,255,255,0.28)",
              boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
            }}
          >
            ✏️
          </div>
          <div style={{ position: "relative", minWidth: 0, flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, letterSpacing: "-0.01em" }}>
              Мэдээлэл засах
            </h2>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13.5,
                color: "rgba(255,255,255,0.85)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {member.name}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Хаах" className="ft-modal-close">
            ✕
          </button>
        </div>

        <form onSubmit={submit} style={{ padding: "24px 26px" }}>
          {error && (
            <div
              style={{
                marginBottom: 16,
                borderRadius: 10,
                background: "#fef2f2",
                border: "1px solid #fecaca",
                padding: "10px 13px",
                fontSize: 13.5,
                color: "#dc2626",
              }}
            >
              {error}
            </div>
          )}

          {/* Нэр */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>
              Нэр <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="ft-input"
              style={fieldStyle}
            />
          </div>

          {/* Хүйс */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Хүйс</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { val: "male", label: "Эрэгтэй", icon: "♂" },
                { val: "female", label: "Эмэгтэй", icon: "♀" },
              ].map((g) => {
                const active = form.gender === g.val;
                return (
                  <button
                    key={g.val}
                    type="button"
                    onClick={() => setForm({ ...form, gender: active ? "" : g.val })}
                    style={chip(active)}
                  >
                    <span style={{ fontSize: 16, lineHeight: 1 }}>{g.icon}</span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Холбоосын төрөл — зөвхөн эцэг эхтэй бол */}
          {member.parentId && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Холбоос</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { val: "", label: "Төрсөн", icon: "🧬" },
                  { val: "adopted", label: "Өргөмөл", icon: "🤝" },
                  { val: "step", label: "Дагавар", icon: "👣" },
                ].map((r) => {
                  const active = form.relation === r.val;
                  return (
                    <button
                      key={r.val || "bio"}
                      type="button"
                      onClick={() => setForm({ ...form, relation: r.val })}
                      style={chip(active)}
                    >
                      <span style={{ fontSize: 14, lineHeight: 1 }}>{r.icon}</span>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Гэр бүлийн байдал — зөвхөн хантай бол */}
          {member.spouseId && (
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Гэр бүл</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {[
                  { val: "", label: "Гэрлэсэн", icon: "❤" },
                  { val: "divorced", label: "Салсан", icon: "💔" },
                ].map((s) => {
                  const active = form.spouseStatus === s.val;
                  return (
                    <button
                      key={s.val || "married"}
                      type="button"
                      onClick={() => setForm({ ...form, spouseStatus: s.val })}
                      style={chip(active)}
                    >
                      <span style={{ fontSize: 16, lineHeight: 1 }}>{s.icon}</span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Төрсөн / Нас барсан он */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Он</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <input
                type="number"
                value={form.birthYear}
                onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                className="ft-input"
                style={fieldStyle}
                placeholder="Төрсөн"
                min="1800"
                max={CURRENT_YEAR}
              />
              <input
                type="number"
                value={form.deathYear}
                onChange={(e) => setForm({ ...form, deathYear: e.target.value })}
                className="ft-input"
                style={fieldStyle}
                placeholder="Нас барсан"
                min="1800"
                max={CURRENT_YEAR}
              />
            </div>
          </div>

          {/* Зураг */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Зураг</label>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={onPickPhoto}
              style={{ display: "none" }}
            />
            {form.photo ? (
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={form.photo}
                  alt="Зураг"
                  style={{
                    width: 76,
                    height: 76,
                    borderRadius: 14,
                    objectFit: "cover",
                    border: "1px solid var(--line)",
                  }}
                />
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="ft-btn ft-btn--ghost"
                    style={{ padding: "8px 12px" }}
                  >
                    Солих
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, photo: "" })}
                    className="ft-btn ft-btn--ghost"
                    style={{ padding: "8px 12px", color: "var(--danger)" }}
                  >
                    Устгах
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={photoBusy}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  padding: "18px",
                  borderRadius: 12,
                  border: "1.5px dashed var(--line)",
                  background: "var(--canvas)",
                  color: "var(--ink-soft)",
                  fontSize: 13.5,
                  fontWeight: 600,
                  cursor: photoBusy ? "wait" : "pointer",
                }}
              >
                <span style={{ fontSize: 18 }}>🖼️</span>
                {photoBusy ? "Боловсруулж байна..." : "Зураг сонгох / оруулах"}
              </button>
            )}
          </div>

          {/* Тэмдэглэл — чат шиг том box */}
          <div style={{ marginBottom: 4 }}>
            <label style={labelStyle}>Тэмдэглэл</label>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="ft-input"
              style={{ ...fieldStyle, minHeight: 96, resize: "vertical", lineHeight: 1.5 }}
              rows={4}
              placeholder="Нэмэлт мэдээлэл, намтар, дурсамж бичих..."
            />
          </div>

          <div
            style={{
              marginTop: 22,
              display: "flex",
              gap: 12,
              borderTop: "1px solid var(--line)",
              paddingTop: 20,
            }}
          >
            <button
              type="button"
              onClick={onClose}
              className="ft-btn ft-btn--ghost"
              style={{ flex: 1, justifyContent: "center", padding: "12px", fontSize: 14 }}
            >
              Болих
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="ft-btn ft-btn--primary"
              style={{ flex: 1, justifyContent: "center", padding: "12px", fontSize: 14 }}
            >
              {loading ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
