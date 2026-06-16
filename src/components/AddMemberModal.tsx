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

export default function AddMemberModal({ mode, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: "",
    birthYear: "",
    deathYear: "",
    gender: mode.type === "spouse" ? (mode.spouseForId ? "" : "") : "",
    note: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const title =
    mode.type === "spouse"
      ? "Эхнэр / Нөхөр нэмэх"
      : mode.type === "child"
      ? "Хүүхэд нэмэх"
      : mode.type === "parent"
      ? "Аав / Ээж нэмэх"
      : "Үндэс гишүүн нэмэх";

  const subtitle =
    mode.type === "spouse"
      ? `"${mode.spouseForName}"-н эхнэр/нөхөр`
      : mode.type === "child"
      ? `Эцэг/эх: ${mode.parentName}`
      : mode.type === "parent"
      ? `"${mode.childForName}"-н аав/ээж`
      : "Модны үндэс (эцэг эх байхгүй)";

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

  const inputCls =
    "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
        </div>

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
            {error}
          </div>
        )}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Нэр *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className={inputCls}
              placeholder="Бат-Эрдэнэ"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Төрсөн он</label>
              <input
                type="number"
                value={form.birthYear}
                onChange={(e) => setForm({ ...form, birthYear: e.target.value })}
                className={inputCls}
                placeholder="1980"
                min="1800"
                max={CURRENT_YEAR}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Нас барсан он</label>
              <input
                type="number"
                value={form.deathYear}
                onChange={(e) => setForm({ ...form, deathYear: e.target.value })}
                className={inputCls}
                placeholder="2020"
                min="1800"
                max={CURRENT_YEAR}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Хүйс</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
              className={inputCls}
            >
              <option value="">Сонгох</option>
              <option value="male">Эрэгтэй</option>
              <option value="female">Эмэгтэй</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Тэмдэглэл</label>
            <input
              type="text"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              className={inputCls}
              placeholder="Нэмэлт мэдээлэл..."
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm hover:bg-gray-50 transition"
            >
              Болих
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 text-sm font-medium transition disabled:opacity-50"
            >
              {loading ? "Хадгалж байна..." : "Нэмэх"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
