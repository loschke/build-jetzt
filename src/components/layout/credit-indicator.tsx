"use client"

import { useEffect, useState } from "react"
import { Coins } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import { formatCredits, getBalanceColorClass } from "@/lib/credits"

export function CreditIndicator() {
  const [balance, setBalance] = useState<number | null>(null)

  useEffect(() => {
    let mounted = true

    async function load() {
      try {
        const res = await fetch("/api/credits")
        if (res.ok && mounted) {
          const data = await res.json()
          setBalance(data.balance)
        }
      } catch {
        // Non-critical
      }
    }

    load()

    // Refresh balance after chat messages (no background polling — credits only change via user activity)
    const handleUpdate = () => { setTimeout(load, 2000) }
    window.addEventListener("chat-updated", handleUpdate)

    return () => {
      mounted = false
      window.removeEventListener("chat-updated", handleUpdate)
    }
  }, [])

  if (balance === null) return null

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            getBalanceColorClass(balance)
          )}
        >
          <Coins className="size-3" />
          <span>{formatCredits(balance)}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{balance.toLocaleString("de-DE")} Credits</p>
      </TooltipContent>
    </Tooltip>
  )
}
