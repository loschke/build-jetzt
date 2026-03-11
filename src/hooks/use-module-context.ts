"use client"

import { usePathname } from "next/navigation"

import { primaryModules } from "@/config/navigation"

export function useModuleContext() {
  const pathname = usePathname()

  const currentModule = primaryModules.find(
    (mod) => pathname === mod.url || pathname.startsWith(`${mod.url}/`)
  )

  return {
    moduleSlug: currentModule?.chatContext ?? null,
    moduleTitle: currentModule?.title ?? null,
    hasChat: Boolean(currentModule?.chatContext),
  }
}
