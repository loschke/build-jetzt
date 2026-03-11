"use client"

import { ThemeProvider as NextThemesProvider } from "next-themes"
import { features } from "@/config/features"

interface ThemeProviderProps {
  children: React.ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  if (!features.darkMode.enabled) {
    return <>{children}</>
  }

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme={features.darkMode.defaultTheme}
      disableTransitionOnChange
    >
      {children}
    </NextThemesProvider>
  )
}
