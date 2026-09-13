import type { Metadata } from "next";
import { Barlow, Barlow_Condensed, Russo_One, Space_Mono } from "next/font/google";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

const russoOne = Russo_One({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-russo-one",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  weight: ["500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

const barlow = Barlow({
  weight: ["400", "500", "600"],
  subsets: ["latin"],
  variable: "--font-barlow",
  display: "swap",
});

const spaceMono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-space-mono",
  display: "swap",
});

const DESCRIPTION =
  "Partagez des photos de votre Volkswagen Golf et découvrez celles de la communauté. Toutes générations, Mk1 à Mk8. Gratuit et sans publicité.";

export const metadata: Metadata = {
  // Base absolue : sans elle, l'image d'un partage resterait un chemin relatif,
  // que ni Facebook ni WhatsApp ne savent résoudre.
  metadataBase: SITE_URL,
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s`,
  },
  description: DESCRIPTION,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "fr_FR",
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body
        className={`${russoOne.variable} ${barlowCondensed.variable} ${barlow.variable} ${spaceMono.variable}`}
      >
        {children}
      </body>
    </html>
  );
}
