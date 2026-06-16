"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  user: { name: string; email: string } | null;
}

export default function Navbar({ user }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function logout() {
    setLoading(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.refresh();
    setLoading(false);
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
      <h1 className="text-xl font-bold text-gray-800">🌳 Ургийн Мод</h1>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="text-sm text-gray-600">
              Сайн байна уу, <strong>{user.name}</strong>
            </span>
            <button
              onClick={logout}
              disabled={loading}
              className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition"
            >
              Гарах
            </button>
          </>
        ) : (
          <>
            <a
              href="/login"
              className="text-sm text-blue-600 hover:underline"
            >
              Нэвтрэх
            </a>
            <a
              href="/register"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
            >
              Бүртгүүлэх
            </a>
          </>
        )}
      </div>
    </nav>
  );
}
