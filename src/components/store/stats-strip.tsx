"use client";

import { motion } from "framer-motion";
import { CountUp } from "@/components/fx/count-up";
import { useI18n } from "@/i18n/client";

export function StatsStrip({ products, categories, areas, fee }: { products: number; categories: number; areas: number; fee: number }) {
  const { t } = useI18n();
  const items = [
    { v: products, s: "+", label: t("home.statProducts") },
    { v: categories, s: "", label: t("home.statCategories") },
    { v: areas, s: "", label: t("home.statAreas") },
    { v: fee, p: "$", s: "", label: t("home.statDelivery") },
  ];
  return (
    <section className="mx-auto max-w-[90rem] px-4 md:px-6 py-8">
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} transition={{ staggerChildren: 0.1 }} className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-border shadow-card md:grid-cols-4">
        {items.map((it) => (
          <motion.div key={it.label} variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }} whileHover={{ scale: 1.04 }} className="bg-surface px-6 py-8 text-center">
            <CountUp value={it.v} prefix={it.p ?? ""} suffix={it.s} className="text-shimmer text-4xl font-black md:text-5xl" />
            <p className="mt-2 text-sm font-semibold text-muted">{it.label}</p>
          </motion.div>
        ))}
      </motion.div>
    </section>
  );
}
