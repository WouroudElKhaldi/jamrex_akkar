"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/i18n/client";

export function WhatsAppFloat({ number }: { number: string }) {
  const { t } = useI18n();
  const n = number.replace(/\D/g, "");
  if (!n) return null;
  return (
    <motion.a
      href={`https://wa.me/${n}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={t("common.whatsapp")}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay: 1.2, type: "spring" }}
      whileHover={{ scale: 1.08 }}
      className="fixed bottom-5 end-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25d366] text-white shadow-glow"
    >
      <span className="absolute inset-0 animate-ping rounded-full bg-[#25d366]/40" />
      <svg viewBox="0 0 24 24" className="relative h-7 w-7" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15l-1.4 5 5.2-1.4A10 10 0 1 0 12 2zm5.4 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.2-4.6-4-4.7-4.2-.1-.2-1.1-1.5-1.1-2.8s.7-2 1-2.3c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.9 2.1c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.4-.1.7.2.3.8 1.3 1.8 2.1 1.2 1.1 2.2 1.4 2.5 1.6.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l2 1c.3.1.5.2.6.3.1.3.1.7-.1 1.3z" /></svg>
    </motion.a>
  );
}
