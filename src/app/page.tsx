import Link from "next/link"
import { ArrowRight } from "lucide-react"

import { brand } from "@/config/brand"
import { BrandWordmark } from "@/components/layout/brand-wordmark"

export default function LandingPage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Viewport Frame */}
      <div
        className="pointer-events-none fixed inset-0 z-50 border-[5px] border-primary"
        aria-hidden="true"
      />

      {/* Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 sm:px-8">
        <BrandWordmark />
        <Link
          href="/api/auth/sign-in"
          className="micro-label transition-colors hover:text-foreground"
        >
          Anmelden
        </Link>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col justify-center px-6 pb-20 sm:px-8 lg:px-20">
        <p className="micro-label mb-6 flex items-center gap-2">
          <span className="inline-block size-1.5 rounded-full bg-primary" />
          {brand.name}
        </p>

        <h1 className="headline-black mb-6 max-w-3xl text-4xl leading-[1.08] tracking-tighter sm:text-5xl lg:text-6xl">
          {brand.description}
          <span className="text-primary">.</span>
        </h1>

        <p className="mb-10 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
          Wähle ein Modul und lerne durch praktische Anwendung.
        </p>

        <div>
          <Link
            href="/api/auth/sign-in"
            className="inline-flex items-center gap-2 bg-foreground px-7 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Jetzt starten
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t px-6 py-8 sm:px-8">
        <div className="flex items-center justify-between">
          <p className="micro-label">
            {brand.name} — {brand.description}
          </p>
          <p className="micro-label">© 2026</p>
        </div>
      </footer>
    </div>
  )
}
