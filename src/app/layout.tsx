import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ургийн Мод",
  description: "Гэр бүлийн ургийн модны систем",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
