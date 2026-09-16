import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Invitation secrets can occur in both paths and encoded auth return URLs.
  logging: { incomingRequests: { ignore: [/member-invitations/, /\/invite\//, /\/api\/public\/invitations\//] } },
  async headers() {
    return [
      ...["/invite/:path*", "/api/public/invitations/:path*"].map(source => ({ source, headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] })),
      { source: "/member-invitations/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }] },
      { source: "/login", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/signup", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
