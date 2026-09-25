import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hive",
  description: "Multi-agent research orchestrator",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen font-mono text-sm">{children}</body>
    </html>
  );
}
