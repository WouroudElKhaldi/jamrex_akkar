import { Sparkles } from "lucide-react";

/** Endless scrolling ribbon of category names (pure CSS, pauses on hover). */
export function MarqueeStrip({ words }: { words: string[] }) {
  if (words.length === 0) return null;
  const row = [...words, ...words, ...words, ...words];
  return (
    <div aria-hidden className="relative overflow-hidden border-y border-border bg-gradient-to-r from-brand to-[#2b62f0] py-3.5 text-white">
      <div className="marquee-slow flex w-max items-center gap-8 whitespace-nowrap text-lg font-black uppercase tracking-wide">
        {row.concat(row).map((w, i) => (
          <span key={i} className="inline-flex items-center gap-8">
            {w}
            <Sparkles className="h-5 w-5 text-accent" />
          </span>
        ))}
      </div>
    </div>
  );
}
