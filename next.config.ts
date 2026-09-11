import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Invitation secrets can occur in both paths and encoded auth return URLs.
  logging: { incomingRequests: { ignore: [/member-invitations/] } },
  async headers() {
    return [
      { source: "/member-invitations/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }, { key: "Cache-Control", value: "private, no-store" }] },
      { source: "/login", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
      { source: "/signup", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] },
    ];
  },
};

export default nextConfig;
