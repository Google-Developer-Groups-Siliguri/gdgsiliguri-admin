"use client";

import { createContext, use, useMemo, type ReactNode } from "react";

import { sectionDefFor, type RegistryInput, type SectionDef } from "@/lib/sections/registry";

const RegistryContext = createContext<Promise<RegistryInput> | null>(null);

export function RegistryProvider({ registry, children }: { registry: Promise<RegistryInput>; children: ReactNode }) {
  return <RegistryContext value={registry}>{children}</RegistryContext>;
}

export function useRegistry(): RegistryInput {
  const promise = use(RegistryContext);
  if (!promise) throw new Error("useRegistry needs a RegistryProvider");
  return use(promise);
}

export function useSectionDef(id: string): SectionDef {
  const input = useRegistry();
  return useMemo(() => sectionDefFor(id, input), [id, input]);
}
