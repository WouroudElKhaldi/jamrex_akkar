import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Plus_Jakarta_Sans, Cairo } from "next/font/google";
import "./globals.css";

const latin = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-latin", display: "swap" });
const arabic = Cairo({ subsets: ["arabic", "latin"], variable: "--font-arabic", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: { default: "Jamrex Miniyeh", template: "%s · Jamrex Miniyeh" },
  description: "Jamrex Miniyeh — cleaning products, car care and cosmetics delivered across Akkar.",
  icons: { icon: "/brand/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#080e1f" },
  ],
  width: "device-width",
  initialScale: 1,
};

const themeScript = `try{var t=localStorage.getItem('theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const locale = h.get("x-locale") === "ar" ? "ar" : "en";
  const nonce = h.get("x-nonce") ?? undefined; // per-request CSP nonce set by middleware
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} className={`${latin.variable} ${arabic.variable}`} suppressHydrationWarning>
      <head>
        {/* Browsers blank the nonce attribute after load, so React would report a false hydration mismatch here */}
        <script nonce={nonce} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
