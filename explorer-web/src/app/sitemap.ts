import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/seo/site";

/** Public routes worth indexing; dynamic block/tx/address URLs are discovered via links. */
const PUBLIC_ROUTES: { path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }[] = [
  { path: "/", changeFrequency: "hourly", priority: 1 },
  { path: "/vrm", changeFrequency: "hourly", priority: 0.95 },
  { path: "/vrc", changeFrequency: "hourly", priority: 0.95 },
  { path: "/insights", changeFrequency: "daily", priority: 0.85 },
  { path: "/search", changeFrequency: "monthly", priority: 0.7 },
  { path: "/vrm/richlist", changeFrequency: "daily", priority: 0.8 },
  { path: "/vrc/richlist", changeFrequency: "daily", priority: 0.8 },
  { path: "/vrm/leaderboard", changeFrequency: "daily", priority: 0.75 },
  { path: "/vrm/miners", changeFrequency: "daily", priority: 0.75 },
  { path: "/vrm/peers", changeFrequency: "weekly", priority: 0.6 },
  { path: "/vrc/peers", changeFrequency: "weekly", priority: 0.6 },
  { path: "/blocks", changeFrequency: "hourly", priority: 0.65 },
  { path: "/api/docs", changeFrequency: "monthly", priority: 0.55 },
  { path: "/about", changeFrequency: "yearly", priority: 0.4 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const lastModified = new Date();

  return PUBLIC_ROUTES.map(({ path, changeFrequency, priority }) => ({
    url: `${siteUrl}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
