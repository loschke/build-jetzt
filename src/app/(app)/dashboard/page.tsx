import { getUser } from "@/lib/auth"

export default async function DashboardPage() {
  const user = await getUser()
  const displayName = user?.name || user?.email || "dort"

  return (
    <div className="mx-auto max-w-3xl py-12">
      <p className="micro-label mb-4 flex items-center gap-2">
        <span className="inline-block size-1.5 rounded-full bg-primary" />
        Dashboard
      </p>
      <h1 className="headline-black mb-2 text-4xl">
        Willkommen, {displayName}
        <span className="text-primary">.</span>
      </h1>
      <p className="text-lg text-muted-foreground">
        Wähle ein Modul in der Sidebar, um dein Lernen fortzusetzen.
      </p>
    </div>
  )
}
