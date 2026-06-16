"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) { setError(data.error); return; }
    router.push("/");
    router.refresh();
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      background: "linear-gradient(135deg, #f0f9ff 0%, #e8f5e9 100%)",
    }}>
      {/* Left panel */}
      <div style={{
        flex: 1, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
        background: "linear-gradient(160deg, #1e3a5f 0%, #0f766e 100%)",
        color: "#fff",
      }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>🌳</div>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 12, textAlign: "center" }}>Ургийн Мод</div>
        <div style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", textAlign: "center", maxWidth: 260, lineHeight: 1.6 }}>
          Гэр бүлийн түүхийг хадгалж, үеийн үед дамжуулж ирэх платформ
        </div>
      </div>

      {/* Right panel - form */}
      <div style={{
        flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
        padding: "40px 24px",
      }}>
        <div style={{ width: "100%", maxWidth: 380 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#1e293b", marginBottom: 6 }}>Нэвтрэх</h1>
          <p style={{ fontSize: 14, color: "#64748b", marginBottom: 28 }}>
            Бүртгэлгүй юу?{" "}
            <a href="/register" style={{ color: "#2563eb", textDecoration: "none", fontWeight: 600 }}>Бүртгүүлэх</a>
          </p>

          {error && (
            <div style={{ marginBottom: 16, fontSize: 13, color: "#dc2626", background: "#fef2f2", padding: "10px 14px", borderRadius: 8, border: "1px solid #fecaca" }}>
              {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Email</label>
              <input
                type="email" required value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                placeholder="example@mail.com"
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.currentTarget.style.borderColor = "#2563eb"}
                onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Нууц үг</label>
              <input
                type="password" required value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="••••••••"
                style={{ width: "100%", border: "1.5px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                onFocus={e => e.currentTarget.style.borderColor = "#2563eb"}
                onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: "100%", padding: "12px", borderRadius: 10, border: "none",
                background: loading ? "#93c5fd" : "#2563eb",
                color: "#fff", fontSize: 15, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                marginTop: 4, transition: "background 0.15s",
              }}
            >
              {loading ? "Нэвтэрч байна..." : "Нэвтрэх"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
