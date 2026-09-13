import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Espaces personnels : rien à indexer, et rien qu'un robot puisse voir
      // de toute façon.
      disallow: ["/profil", "/compte", "/notifications"],
    },
    sitemap: new URL("/sitemap.xml", SITE_URL).toString(),
  };
}
