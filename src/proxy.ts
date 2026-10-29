import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Next.js 16 : « proxy » est le nouveau nom du middleware. Sans session, tout /admin renvoie vers /connexion.
// Contrôle rapide seulement : chaque page d'admin revérifie la session.
export const proxy = auth((request) => {
  if (!request.auth) return NextResponse.redirect(new URL("/connexion", request.nextUrl));
});

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
