"use client"

import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { features } from "@/config/features"

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()

  if (!features.darkMode.enabled) {
    return null
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-primary-foreground hover:bg-primary-foreground/15 hover:text-primary-foreground"
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          <Sun className="size-4 scale-100 rotate-0 transition-transform dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute size-4 scale-0 rotate-90 transition-transform dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Theme wechseln</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>Theme wechseln</TooltipContent>
    </Tooltip>
  )
}
