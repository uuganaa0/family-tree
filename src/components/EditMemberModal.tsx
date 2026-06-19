"use client";

import { useState } from "react";
import type { Member } from "./FamilyTree";

interface Props {
  member: Member;
  onClose: () => void;
  onSaved: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

export default function EditMemberModal({ member, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: member.name,
    birthYear: member.birthYear?.toString() ?? "",
    deathYear: member.deathYear?.toString() ?? "",
    gender: member.gender ?? "",
    note: member.note ?? "",
    relation: member.relation ?? "",
    spouseStatus: member.spouseStatus ?? "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch(`/api/members/${member.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error); return; }
    onSaved();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.5)", backdropFilter: "blur(3px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-2xl bg-white"
        style={{ boxShadow: "var(--shadow-lg)", animation: "ft-pop-in 0.2s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header — teal brand band */}
        <div
          className="relative flex items-center gap-4 px-8 py-6"
          style={{
            background: "linear-gradient(150deg, var(--brand-light), var(--brand-dark))",
            color: "#fff",
          }}
        >
          <div
            className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-2xl text-3xl"
            style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.2)" }}
          >
            ✏️
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold tracking-tight">Мэдээлэл засах</h2>
            <p className="mt-1 truncate text-[13.5px]" style={{ color: "rgba(255,255,255,0.82)" }}>
              {member.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-lg text-xl leading-none transition"
            style={{ color: "rgba(255,255,255,0.85)", background: "rgba(255,255,255,0.12)" }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-8 py-7">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
          )}

          {/* Нэр */}
          <div className="grid grid-cols-[96px_1fr] items-center gap-3">
            <label className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              Нэр <span style={{ color: "var(--danger)" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="ft-input w-full"
              style={{ fontSize: 15, padding: "10px 13px" }}
            />
          </div>

          {/* Хүйс */}
          <div className="grid grid-cols-[96px_1fr] items-center gap-3">
            <label className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              Хүйс
            </label>
            <div className="grid grid-cols-2 gap-2.5">
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
                    className="flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-semibold transition"
                    style={{
                      borderColor: active ? "var(--brand)" : "var(--line)",
                      background: active ? "color-mix(in srgb, var(--brand) 9%, white)" : "#fff",
                      color: active ? "var(--brand-dark)" : "var(--ink-soft)",
                    }}
                  >
                    <span className="text-base leading-none">{g.icon}</span>
                    {g.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Холбоосын төрөл — зөвхөн эцэг эхтэй бол */}
          {member.parentId && (
            <div className="grid grid-cols-[96px_1fr] items-center gap-3">
              <label className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
                Холбоос
              </label>
              <div className="grid grid-cols-3 gap-2.5">
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
                      className="flex items-center justify-center gap-1 rounded-lg border py-2.5 text-[13px] font-semibold transition"
                      style={{
                        borderColor: active ? "var(--brand)" : "var(--line)",
                        background: active ? "color-mix(in srgb, var(--brand) 9%, white)" : "#fff",
                        color: active ? "var(--brand-dark)" : "var(--ink-soft)",
                      }}
                    >
                      <span className="text-sm leading-none">{r.icon}</span>
                      {r.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Гэр бүлийн байдал — зөвхөн хантай бол */}
          {member.spouseId && (
            <div className="grid grid-cols-[96px_1fr] items-center gap-3">
              <label className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
                Гэр бүл
              </label>
              <div className="grid grid-cols-2 gap-2.5">
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
                      className="flex items-center justify-center gap-1.5 rounded-lg border py-2.5 text-sm font-semibold transition"
                      style={{
                        borderColor: active ? "var(--brand)" : "var(--line)",
                        background: active ? "color-mix(in srgb, var(--brand) 9%, white)" : "#fff",
                        color: active ? "var(--brand-dark)" : "var(--ink-soft)",
                      }}
                    >
                      <span className="text-base leading-none">{s.icon}</span>
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Төрсөн / Нас барсан он */}
          <div className="grid grid-cols-[96px_1fr] items-center gap-3">
            <label className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              Он
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <input
                type="number"
                value={form.birthYear}
                onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                className="ft-input w-full"
                style={{ fontSize: 15, padding: "10px 13px" }}
                placeholder="Төрсөн"
                min="1800"
                max={CURRENT_YEAR}
              />
              <input
                type="number"
                value={form.deathYear}
                onChange={(e) => setForm({ ...form, deathYear: e.target.value })}
                className="ft-input w-full"
                style={{ fontSize: 15, padding: "10px 13px" }}
                placeholder="Нас барсан"
                min="1800"
                max={CURRENT_YEAR}
              />
            </div>
          </div>

          {/* Тэмдэглэл */}
          <div className="grid grid-cols-[96px_1fr] items-center gap-3">
            <label className="text-[13px] font-semibold" style={{ color: "var(--ink-soft)" }}>
              Тэмдэглэл
            </label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className="ft-input w-full"
              style={{ fontSize: 15, padding: "10px 13px" }}
              placeholder="Нэмэлт мэдээлэл..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="ft-btn ft-btn--ghost flex-1 justify-center py-3">
              Болих
            </button>
            <button
              type="submit"
              disabled={loading || !form.name.trim()}
              className="ft-btn ft-btn--primary flex-1 justify-center py-3"
              style={{ fontSize: 14 }}
            >
              {loading ? "Хадгалж байна..." : "Хадгалах"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
