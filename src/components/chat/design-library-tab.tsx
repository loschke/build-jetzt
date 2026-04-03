"use client"

import { Palette, Sparkles, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export function DesignLibraryTab() {
  return (
    <div className="flex w-full max-w-sm flex-col items-center gap-6">
      {/* Visual */}
      <div className="flex size-20 items-center justify-center rounded-2xl bg-muted">
        <Palette className="size-10 text-muted-foreground" />
      </div>

      {/* Description */}
      <div className="text-center">
        <h3 className="mb-2 text-lg font-semibold">Bild aus Vorlage erstellen</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Wähle eine Formel aus der Bibliothek und generiere Bilder mit erprobten Prompt-Templates.
        </p>
      </div>

      {/* CTA */}
      <Button
        size="lg"
        className="gap-2 rounded-full px-8"
        onClick={() => { window.location.href = "/design-library" }}
      >
        <Sparkles className="size-4" />
        Design Library öffnen
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}
