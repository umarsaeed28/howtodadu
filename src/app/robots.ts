import type { MetadataRoute } from "next";

/** Public pages are indexable; the admin, the portal, the API and the admin-only lot pages (src/lib/admin/gate.ts) are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/portal", "/dashboard", "/gc", "/search", "/feasibility", "/listing/", "/invest/", "/saved", "/members"] }],
  };
}
