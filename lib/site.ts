/**
 * Adresse publique du site.
 *
 * Nécessaire aux liens absolus des métadonnées (partage, sitemap) : une URL
 * relative ne veut rien dire dans un aperçu Facebook ou WhatsApp. Vercel
 * fournit `VERCEL_PROJECT_PRODUCTION_URL` ; en local on retombe sur le port
 * de développement.
 */
const fromVercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const SITE_URL = new URL(
  process.env.NEXT_PUBLIC_SITE_URL ??
    (fromVercel ? `https://${fromVercel}` : "http://localhost:3000"),
);
