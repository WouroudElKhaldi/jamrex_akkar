"use client";

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/** A soft light that trails the mouse across the whole page (desktop only). */
export function CursorGlow() {
  const x = useMotionValue(-400);
  const y = useMotionValue(-400);
  const sx = useSpring(x, { stiffness: 90, damping: 20 });
  const sy = useSpring(y, { stiffness: 90, damping: 20 });
  const [on, setOn] = useState(false);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setOn(true);
    const move = (e: PointerEvent) => {
      x.set(e.clientX - 250);
      y.set(e.clientY - 250);
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [x, y]);

  if (!on) return null;
  return <motion.div aria-hidden style={{ x: sx, y: sy }} className="pointer-events-none fixed start-0 top-0 z-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(27,69,214,0.10),transparent_65%)] dark:bg-[radial-gradient(circle,rgba(91,134,255,0.13),transparent_65%)]" />;
}
