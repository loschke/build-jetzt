import { HelpCircle } from "lucide-react"

export default function HelpPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <span className="flex size-16 items-center justify-center bg-primary/10">
        <HelpCircle className="size-8 text-primary" />
      </span>
      <h1 className="text-2xl font-bold">Hilfe & FAQ</h1>
      <p className="text-muted-foreground">
        Häufig gestellte Fragen und Support — Inhalt folgt.
      </p>
    </div>
  )
}
