import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

/** Les pages publiques et stables. Le fil change trop pour être listé page à page. */
export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ["/", "/membres", "/duels", "/mentions", "/confidentialite"];
  return pages.map((path) => ({
    url: new URL(path, SITE_URL).toString(),
    lastModified: new Date(),
    changeFrequency: path === "/" ? "daily" : "monthly",
    priority: path === "/" ? 1 : 0.5,
  }));
}
