import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4">
      <h1 className="text-2xl font-bold">Seite nicht gefunden</h1>
      <p className="text-muted-foreground">
        Die angeforderte Seite existiert nicht.
      </p>
      <Link
        href="/"
        className="text-sm font-medium text-primary hover:text-primary/80"
      >
        Zur Startseite
      </Link>
    </div>
  )
}
