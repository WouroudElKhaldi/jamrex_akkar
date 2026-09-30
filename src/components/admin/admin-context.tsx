"use client";

import { createContext, useContext } from "react";

const Ctx = createContext<string>("/staff");

/** The secret dashboard base path, injected from the server (never imported from env in client code). */
export function AdminBaseProvider({ base, children }: { base: string; children: React.ReactNode }) {
  return <Ctx.Provider value={base}>{children}</Ctx.Provider>;
}
export const useAdminBase = () => useContext(Ctx);
