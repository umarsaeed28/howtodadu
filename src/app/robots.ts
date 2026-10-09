import type { MetadataRoute } from "next";

/** Public pages are indexable; the admin, the portal and the API are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api/", "/portal", "/dashboard", "/gc"] }],
  };
}
