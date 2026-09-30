import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/reveal";

export function Section({ title, subtitle, href, hrefLabel, locale, children, className = "" }: { title: string; subtitle?: string; href?: string; hrefLabel?: string; locale?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`cv-auto mx-auto max-w-[90rem] px-4 md:px-6 py-10 md:py-14 ${className}`}>
      <Reveal>
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black tracking-tight md:text-3xl">{title}</h2>
            {subtitle && <p className="mt-1.5 text-muted">{subtitle}</p>}
            <div className="mt-3 h-1 w-14 rounded-full bg-gradient-to-r from-brand to-accent" />
          </div>
          {href && (
            <Link href={`/${locale}${href}`} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-bold text-brand hover:underline">
              {hrefLabel} <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </Link>
          )}
        </div>
      </Reveal>
      {children}
    </section>
  );
}
