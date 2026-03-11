import { BookOpen } from "lucide-react"

export default function DocsPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
      <span className="flex size-16 items-center justify-center bg-primary/10">
        <BookOpen className="size-8 text-primary" />
      </span>
      <h1 className="text-2xl font-bold">Dokumentation</h1>
      <p className="text-muted-foreground">
        Anleitungen und Referenzmaterial — Inhalt folgt.
      </p>
    </div>
  )
}
