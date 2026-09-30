"use client";

import { useEffect, useRef, useState } from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { ChevronLeft, ChevronRight, Hand } from "lucide-react";
import { useI18n } from "@/i18n/client";

/** Horizontal carousel you grab with the mouse (or finger) and fling. Arrow buttons too. */
export function DragCarousel({ children, itemClass = "w-[230px] sm:w-[260px]" }: { children: React.ReactNode[]; itemClass?: string }) {
  const { t, dir } = useI18n();
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [max, setMax] = useState(0);
  const dragged = useRef(false);
  const rtl = dir === "rtl";

  useEffect(() => {
    const measure = () => {
      if (outer.current && inner.current) setMax(Math.max(0, inner.current.scrollWidth - outer.current.clientWidth));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (inner.current) ro.observe(inner.current);
    return () => ro.disconnect();
  }, [children.length]);

  const bounds = rtl ? { left: 0, right: max } : { left: -max, right: 0 };
  const go = (dirn: 1 | -1) => {
    const step = (outer.current?.clientWidth ?? 600) * 0.8 * (rtl ? -1 : 1);
    const target = Math.min(bounds.right, Math.max(bounds.left, x.get() - dirn * step));
    animate(x, target, { type: "spring", stiffness: 160, damping: 24 });
  };

  return (
    <div className="relative">
      <div ref={outer} className="cursor-grab overflow-hidden active:cursor-grabbing">
        <motion.div
          ref={inner}
          style={{ x }}
          drag="x"
          dragDirectionLock
          dragConstraints={bounds}
          dragElastic={0.12}
          dragTransition={{ power: 0.25, timeConstant: 260 }}
          onDragStart={() => (dragged.current = true)}
          onDragEnd={() => setTimeout(() => (dragged.current = false), 60)}
          onClickCapture={(e) => {
            if (dragged.current) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          className="flex gap-4 pb-3 pt-1"
        >
          {children.map((c, i) => (
            <div key={i} className={`shrink-0 ${itemClass}`}>
              {c}
            </div>
          ))}
        </motion.div>
      </div>

      {max > 0 && (
        <>
          <div className="mt-3 flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted"><Hand className="h-3.5 w-3.5" /> {t("common.dragHint2")}</span>
            <div className="flex gap-2">
              <button onClick={() => go(-1)} aria-label="previous" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface shadow-card transition hover:scale-110 hover:bg-brand hover:text-brand-fg"><ChevronLeft className="h-5 w-5 rtl:rotate-180" /></button>
              <button onClick={() => go(1)} aria-label="next" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface shadow-card transition hover:scale-110 hover:bg-brand hover:text-brand-fg"><ChevronRight className="h-5 w-5 rtl:rotate-180" /></button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
