"use client";

import { useState } from "react";

type ModalMode =
  | { type: "root" }
  | { type: "child"; parentId: string; parentName: string }
  | { type: "parent"; childForId: string; childForName: string }
  | { type: "spouse"; spouseForId: string; spouseForName: string };

interface Props {
  mode: ModalMode;
  onClose: () => void;
  onSaved: () => void;
}

const CURRENT_YEAR = new Date().getFullYear();

// Харилцааны төрөл бүрийн icon / гарчиг (өнгө бүгд нэг teal brand)
const MODE_META: Record<ModalMode["type"], { icon: string; title: string }> = {
  child: { icon: "👶", title: "Хүүхэд нэмэх" },
  parent: { icon: "👴", title: "Аав / Ээж нэмэх" },
  spouse: { icon: "💑", title: "Эхнэр / Нөхөр нэмэх" },
  root: { icon: "🌳", title: "Үндэс гишүүн нэмэх" },
};

export default function AddMemberModal({ mode, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: "",
    birthYear: "",
    deathYear: "",
    gender: "",
    note: "",
    relation: "", // "" = төрсөн, "adopted" = өргөмөл, "step" = дагавар
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const meta = MODE_META[mode.type];

  const subtitle =
    mode.type === "spouse"
      ? `"${mode.spouseForName}"-н хань`
      : mode.type === "child"
      ? `Эцэг/эх: ${mode.parentName}`
      : mode.type === "parent"
      ? `"${mode.childForName}"-н эцэг/эх`
      : "Модны үндэс — дээд гишүүн (эцэг эх байхгүй)";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body =
      mode.type === "spouse"
        ? { ...form, spouseForId: mode.spouseForId }
        : mode.type === "child"
        ? { ...form, parentId: mode.parentId }
        : mode.type === "parent"
        ? { ...form, childForId: mode.childForId }
        : { ...form };

    const res = await fetch("/api/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error);
      return;
    }

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
            {meta.icon}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-extrabold tracking-tight">{meta.title}</h2>
            <p className="mt-1 truncate text-[13.5px]" style={{ color: "rgba(255,255,255,0.82)" }}>
              {subtitle}
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
              autoFocus
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="ft-input w-full"
              style={{ fontSize: 15, padding: "10px 13px" }}
              placeholder="Бат-Эрдэнэ"
            />
          </div>

          {/* Хүйс — teal сонгох товчнууд */}
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

          {/* Холбоосын төрөл — зөвхөн хүүхэд нэмэх үед */}
          {mode.type === "child" && (
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
              {loading ? "Хадгалж байна..." : "Нэмэх"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
