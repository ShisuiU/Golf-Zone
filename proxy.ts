import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_NAME } from "@/lib/session";
import { ACCOUNTS_ENABLED } from "@/lib/flags";

/**
 * Pré-filtrage des routes membres.
 *
 * En Next 16 ce fichier remplace `middleware.ts` (déprécié), et l'export doit
 * s'appeler `proxy`. On se contente de regarder si un cookie de session est
 * présent : aucune requête base ici, car ce code tourne sur chaque requête,
 * y compris les préchargements. La vérification qui fait foi est dans le DAL
 * (`requireUser`), côté page.
 */
const MEMBER_ROUTES = ["/garage"];

export function proxy(request: NextRequest) {
  // Comptes coupés : les routes membres répondent 404, inutile de rediriger
  // vers une page de connexion qui n'existe pas non plus.
  if (!ACCOUNTS_ENABLED) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const needsSession = MEMBER_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (needsSession && !request.cookies.has(COOKIE_NAME)) {
    const target = new URL("/connexion", request.nextUrl);
    return NextResponse.redirect(target);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/garage/:path*"],
};
