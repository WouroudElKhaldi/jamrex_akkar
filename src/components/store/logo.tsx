import Link from "next/link";
import { imageUrl } from "@/lib/utils";

/** Text wordmark by default; shows the uploaded logo image when staff set one in Website content. */
export function Logo({ locale, logo, logoDark, name, className = "" }: { locale: string; logo?: string; logoDark?: string; name: string; className?: string }) {
  return (
    <Link href={`/${locale}`} className={`inline-flex items-center gap-2 ${className}`} aria-label={name}>
      {logo ? (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl(logo, "sm")} alt={name} fetchPriority="high" className={`h-10 w-auto ${logoDark ? "dark:hidden" : "rounded-xl dark:bg-white dark:px-2.5 dark:py-1"}`} />
          {logoDark && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl(logoDark, "sm")} alt={name} loading="lazy" className="hidden h-10 w-auto dark:block" />
          )}
        </>
      ) : (
        <>
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-accent text-lg font-black text-white shadow-card">J</span>
          <span className="leading-none">
            <span className="block text-lg font-black tracking-tight">JAMREX</span>
            <span className="block text-[10px] font-bold tracking-[0.28em] text-accent">MINIYEH</span>
          </span>
        </>
      )}
    </Link>
  );
}
