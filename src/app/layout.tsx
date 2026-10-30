import type { Metadata } from "next";
import { Readex_Pro } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

// Police de marque, arabe et latin ; servie par Next.js depuis le site lui-même.
const readexPro = Readex_Pro({ subsets: ["latin", "arabic"], display: "swap" });

export const metadata: Metadata = {
  title: "choofauto",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={readexPro.className}>
      <body>{children}</body>
    </html>
  );
}
