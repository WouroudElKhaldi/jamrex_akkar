import { NextResponse } from "next/server";
import { getStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

// Web-app manifest for the staff app. Scope/start URL contain the secret admin path,
// so this file is only linked from admin pages.
export async function GET() {
  // the manifest contains the secret dashboard path: only signed-in staff may read it (404 for everyone else)
  if (!(await getStaff())) return new NextResponse("Not found", { status: 404 });
  const base = "/" + (process.env.ADMIN_PATH || "staff");
  return NextResponse.json(
    {
      name: "Jamrex Miniyeh — Staff",
      short_name: "Jamrex Staff",
      start_url: base + "/",
      scope: base + "/",
      display: "standalone",
      background_color: "#080e1f",
      theme_color: "#1b45d6",
      icons: [
        { src: "/brand/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        { src: "/brand/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } },
  );
}
