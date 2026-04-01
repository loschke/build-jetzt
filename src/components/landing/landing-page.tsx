import {
  Globe,
  Users,
  Sparkles,
  Brain,
  Shield,
  Layers,
  FormInput,
  MonitorSmartphone,
  Server,
  Cloud,
  SlidersHorizontal,
  Settings,
  Mail,
  Wrench,
  ArrowRight,
  LogIn,
} from "lucide-react"

/* ─── Layout Primitives ─── */

/** Full-width band with subtle background for visual rhythm */
function Band({
  children,
  muted = false,
}: {
  children: React.ReactNode
  muted?: boolean
}) {
  return (
    <div className={muted ? "bg-muted/30" : ""}>
      <div className="mx-auto max-w-4xl px-6 py-14 sm:py-16">{children}</div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-sm uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

/* ─── Use Case Card ─── */

function UseCase({
  question,
  children,
}: {
  question: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
        <div className="md:w-1/3">
          <p className="mb-1 text-sm text-muted-foreground">Du fragst:</p>
          <p className="text-[0.95rem] font-semibold leading-snug">
            &ldquo;{question}&rdquo;
          </p>
        </div>
        <div className="hidden items-center md:flex">
          <span className="text-xl text-primary">&rarr;</span>
        </div>
        <div className="border-t border-border pt-4 md:w-2/3 md:border-t-0 md:pt-0">
          <p className="mb-2 text-sm text-muted-foreground">Die KI:</p>
          <div className="space-y-2 text-sm">{children}</div>
        </div>
      </div>
    </div>
  )
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 flex-shrink-0 text-primary">&#9679;</span>
      <span>{children}</span>
    </div>
  )
}

/* ─── Feature Card ─── */

function FeatureCard({
  icon: Icon,
  title,
  children,
  accent = false,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-xl p-6 ${
        accent
          ? "border border-primary/30 bg-primary/5"
          : "border border-border bg-card"
      }`}
    >
      <div className="mb-3 flex items-center gap-3">
        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${accent ? "bg-primary/15" : "bg-muted"}`}>
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
    </div>
  )
}

/* ─── Check Item ─── */

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex-shrink-0 text-green-500">&#10003;</span>
      {children}
    </li>
  )
}

function Excluded({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2">
      <span className="flex-shrink-0 text-muted-foreground/50">&mdash;</span>
      <span className="text-muted-foreground/70">{children}</span>
    </li>
  )
}

/* ─── Main Component ─── */

export function LandingPage() {
  return (
    <div>
      {/* ═══ HERO ═══ */}
      <div className="mx-auto max-w-4xl px-6 pb-8 pt-16 sm:pt-20">
        <h1 className="headline-black mb-8 text-3xl leading-[1.15] sm:text-4xl md:text-[3.25rem]">
          KI sollte sich anfühlen{" "}
          <span className="text-primary">wie ein gutes Team.</span>
        </h1>
        <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
          <p className="mb-4 text-lg leading-relaxed text-muted-foreground sm:text-xl">
            Nicht wie ein Textfeld das auf Befehle wartet. Sondern wie ein
            Kollege der mitdenkt, die richtigen Werkzeuge greift und trotzdem
            fragt bevor er Entscheidungen trifft.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Diese Plattform ist aus der eigenen Arbeit entstanden. Aus dem
            täglichen Umgang mit KI und dem Wunsch, das Beste aus dem was ich
            kenne zusammenzuführen und mit dem zu ergänzen, was in der Praxis
            fehlt. Das Ziel: Eine KI die autonom handelt wo es sinnvoll ist und
            Kontrolle abgibt wo der Mensch sie braucht.
          </p>
          <div className="mt-6">
            <a
              href="/api/auth/sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <LogIn className="h-4 w-4" />
              Login & Ausprobieren
            </a>
          </div>
        </div>
      </div>

      {/* ═══ KI-ARBEITSPLATZ ═══ */}
      <Band muted>
        <SectionLabel>KI-Arbeitsplatz</SectionLabel>
        <h2 className="mb-4 text-xl font-bold sm:text-2xl md:text-3xl">
          Du sagst was du brauchst.
          <br />
          Die KI entscheidet wie.
        </h2>
        <p className="mb-10 max-w-2xl text-muted-foreground">
          Kein Prompt-Engineering, kein manuelles Orchestrieren. Die Plattform
          wählt das passende Modell, die richtigen Werkzeuge und das richtige
          Format. Hier ein paar Beispiele.
        </p>

        <div className="space-y-4">
          <UseCase question="Recherchiere den aktuellen Stand von KI-Regulierung in der EU">
            <Bullet>
              Startet eine Deep Research (5-12 Minuten Tiefenanalyse über
              mehrere Quellen)
            </Bullet>
            <Bullet>
              Erstellt einen strukturierten Report mit Quellenverzeichnis als
              eigenständiges Dokument
            </Bullet>
            <Bullet>
              Du kannst den Report im Side-Panel lesen, editieren und
              downloaden
            </Bullet>
          </UseCase>

          <UseCase question="Was sind die neuesten Entwicklungen bei Anthropic?">
            <Bullet>
              Nutzt Google Search Grounding für tagesaktuelle Informationen
            </Bullet>
            <Bullet>
              Zeigt Inline-Quellen im Antworttext, direkt verlinkt und
              nachprüfbar
            </Bullet>
          </UseCase>

          <UseCase question="Erstell mir eine Landing Page für einen Workshop">
            <Bullet>
              Generiert ein production-ready HTML-Design mit Tailwind CSS
            </Bullet>
            <Bullet>
              Zeigt es als Live-Preview im Side-Panel. Du sagst &ldquo;mach
              den Header größer&rdquo; und sie iteriert
            </Bullet>
          </UseCase>

          <UseCase question="Ich brauche ein Headerbild für einen Artikel über Remote Work">
            <Bullet>
              Generiert Bildvarianten. Nicht zufrieden? &ldquo;Weniger
              Stock-Foto, mehr illustrativ&rdquo; und sie iteriert
            </Bullet>
            <Bullet>
              Galerie-Ansicht mit allen Versionen. Zwei Bilder kombinieren
              geht auch
            </Bullet>
            <Bullet>
              Oder starte in der Design Library: 68 erprobte Prompt-Formeln
              mit Beispielbildern. Stil wählen, Motiv beschreiben, fertig
            </Bullet>
          </UseCase>

          <UseCase question="Schau dir mal die Website meines Kunden an und sag mir was auffällt">
            <Bullet>
              Ruft die Seite ab, liest den Inhalt, analysiert Struktur und
              Messaging
            </Bullet>
            <Bullet>
              Extrahiert bei Bedarf das Branding (Farben, Fonts, Bildsprache)
              als Grundlage für weitere Arbeit
            </Bullet>
            <Bullet>
              Kann von dort aus weiterarbeiten: SEO-Analyse starten,
              Verbesserungsvorschläge als Dokument erstellen oder direkt einen
              Redesign-Entwurf generieren
            </Bullet>
          </UseCase>

          <UseCase question="Fass das Gespräch als Action Items zusammen">
            <Bullet>
              Analysiert den gesamten Chat und erstellt eine priorisierte
              Tabelle. Als Dokument oder als Audio für unterwegs
            </Bullet>
          </UseCase>

          <UseCase question="Findest du ein gutes YouTube-Video zu dem Thema?">
            <Bullet>
              Durchsucht YouTube, zeigt Ergebnisse mit Thumbnails. Du wählst
              ein Video
            </Bullet>
            <Bullet>
              Die KI analysiert das Video multimodal (Transkript + Visuelles)
              und fasst die Kernaussagen zusammen
            </Bullet>
          </UseCase>
        </div>

        <p className="mt-8 rounded-lg bg-background/60 p-4 text-sm text-muted-foreground">
          Die KI entscheidet autonom welche Tools sie nutzt. Aber sie
          entscheidet nicht über deine Daten, deine Ergebnisse oder deine
          Arbeitsrichtung. Diese Balance ist der Kern der Plattform.
        </p>
      </Band>

      {/* ═══ WARUM EINE EIGENE PLATTFORM ═══ */}
      <Band>
        <SectionLabel>Warum eine eigene Plattform</SectionLabel>
        <h2 className="mb-4 text-xl font-bold sm:text-2xl md:text-3xl">
          Das Beste aus zwei Welten. Plus das, was fehlt.
        </h2>
        <p className="mb-10 max-w-2xl text-muted-foreground">
          Ich nutze Claude und Gemini täglich, beide als Pro-Account. Die
          Modelle sind hervorragend und können enorm viel. Aber in meiner
          Arbeit als KI-Berater und in der täglichen Praxis bin ich immer
          wieder auf Lücken gestoßen. Also habe ich angefangen, das Beste aus
          dem was ich kenne zusammenzuführen und mit dem zu ergänzen, was mir
          gefehlt hat.
        </p>

        <div className="mb-10 space-y-4">
          <FeatureCard
            icon={Wrench}
            title="Integrierte Werkzeuge für den ganzen Arbeitsalltag"
          >
            <p>
              Ich wollte einen Ort an dem ich recherchieren, gestalten,
              schreiben und analysieren kann, ohne zwischen Tools zu wechseln.
              Bildgenerierung mit iterativer Galerie und Design Library
              mit 68 Prompt-Formeln, YouTube-Suche mit Video-Analyse,
              Google Search Grounding mit Inline-Quellen,
              UI-Design-Generierung auf Production-Niveau. 21 Werkzeuge, die
              die KI autonom einsetzt wenn die Aufgabe es erfordert.
            </p>
          </FeatureCard>

          <FeatureCard
            icon={Users}
            title="Spezialisierte Experten für unterschiedliche Aufgaben"
          >
            <p>
              Ich arbeite anders wenn ich Code schreibe als wenn ich einen
              Blogpost formuliere. Deshalb gibt es spezialisierte Experten:
              Ein Code-Assistent der präzise und strukturiert denkt. Ein
              Content Writer der nie in KI-Sprech verfällt. Ein Researcher der
              gründlich ist statt schnell. Jeder mit eigener Temperatur,
              eigenen Skills und eigenem Tool-Zugang. Und wer eigene braucht,
              beschreibt einfach was der Expert können soll. Ein KI-Wizard
              generiert den Rest.
            </p>
          </FeatureCard>

          <FeatureCard
            icon={FormInput}
            title="Geführte Eingaben für wiederholbare Qualität"
          >
            <p>
              In meiner Beratungsarbeit sehe ich ständig: Die Hürde ist nicht
              die KI, sondern das Prompting. Quicktasks lösen das. Formular
              ausfüllen, absenden, qualitätsgesichertes Ergebnis. Hinter jedem
              Quicktask steckt ein optimierter Prompt mit eigenem Modell und
              eigener Temperatur. Wiederholbar, konsistent, und jeder im Team
              kann sie nutzen. Eigene Quicktasks lassen sich per KI-Wizard
              in Minuten erstellen.
            </p>
          </FeatureCard>

          <FeatureCard icon={Layers} title="Flexibles Output-System">
            <p className="mb-3">
              Mir war wichtig, dass Ergebnisse nicht im Chat-Verlauf
              verschwinden. Artifacts sind eigenständige Outputs im
              Side-Panel: HTML mit Live-Preview, Code mit
              Syntax-Highlighting, Bilder, Audio, UI-Designs,
              Office-Dokumente. Auch die Outputs von Skills oder angebundenen
              MCP-Tools landen dort. Editierbar, versioniert, downloadbar.
              Chat ist Prozess, Artifact ist Ergebnis.
            </p>
            <p>
              Und auch im Chat selbst geht mehr als Text: Wenn die KI eine
              Rückfrage stellt, erscheint ein Auswahlfeld statt einer
              Textwand. YouTube-Ergebnisse zeigen Thumbnails und Metadaten.
              Varianten-Vorschläge werden als Tabs dargestellt. Die Antwort
              passt sich dem Inhalt an, nicht umgekehrt.
            </p>
          </FeatureCard>

          <FeatureCard icon={Shield} title="Eingebauter Datenschutz" accent>
            <p>
              Das war mir persönlich besonders wichtig, weil ich viel mit
              Unternehmen arbeite die sensible Daten haben. Bevor eine
              Nachricht das System verlässt, prüft die Plattform automatisch
              auf sensible Daten: E-Mail-Adressen, IBANs, Steuer-IDs,
              Telefonnummern, IP-Adressen. Bei einem Fund entscheidet der
              Nutzer: Maskieren, an ein EU-Modell routen oder lokal
              verarbeiten. Jede Entscheidung wird protokolliert.
            </p>
          </FeatureCard>

          <FeatureCard icon={Brain} title="Kontext der mitwächst">
            <p>
              Ich wollte dass die KI mich mit der Zeit besser versteht.
              Persistentes Memory über Sessions hinweg, kombiniert mit
              Projekt-Kontext und Custom Instructions. Die KI erinnert sich an
              relevante Informationen, kennt die laufenden Projekte und
              respektiert individuelle Präferenzen. Drei Mechanismen die
              zusammenarbeiten, damit nicht jeder Chat bei null startet.
            </p>
          </FeatureCard>
        </div>

        {/* Persönliche Motivation */}
        <div className="rounded-xl border border-border bg-muted/30 p-6">
          <p className="mb-3 text-sm">
            <span className="font-semibold text-primary">
              Warum ich das selbst baue:
            </span>{" "}
            <span className="text-muted-foreground">
              Als KI-Berater muss ich verstehen wie agentische Systeme
              funktionieren. Nicht aus Blogposts, sondern aus eigener
              Entwicklung. Welche Probleme bei Tool-Orchestrierung auftreten,
              wo Prompt-Architektur an Grenzen stößt. Das lernt man nur wenn
              man es baut.
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            Gleichzeitig sehe ich bei Unternehmen die ich berate eine Lücke:
            Viele haben noch keine KI-Infrastruktur und brauchen etwas
            Konfigurierbares für den Einstieg oder die Zeit der Begleitung.
            Diese Plattform kann genau diese Lücke füllen.
          </p>
        </div>
      </Band>

      {/* ═══ DEPLOYMENT ═══ */}
      <Band muted>
        <SectionLabel>Deployment</SectionLabel>
        <h2 className="mb-4 text-xl font-bold sm:text-2xl md:text-3xl">
          Drei Wege, volle Kontrolle
        </h2>
        <p className="mb-10 max-w-2xl text-muted-foreground">
          Die Plattform läuft dort wo sie soll. In der Cloud, in der EU oder
          auf eurer eigenen Hardware. Gleiche Codebase, aber
          unterschiedlicher Feature-Umfang — je nachdem wie viel
          Datensouveränität ihr braucht.
        </p>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {/* Cloud */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                <Cloud className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-bold">Cloud</h3>
            </div>
            <p className="mb-3 text-xs font-medium text-primary">
              Voller Funktionsumfang
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Managed Services, automatische Skalierung. Schnellster Weg zum
              Start. Alle 21 Tools verfügbar.
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <Check>Setup in Minuten</Check>
              <Check>Kein DevOps nötig</Check>
              <Check>
                Alle Features inkl. Deep Research, Bildgenerierung, YouTube,
                TTS
              </Check>
            </ul>
          </div>

          {/* EU-Only */}
          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15">
                <Globe className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-bold">EU-Only</h3>
            </div>
            <p className="mb-3 text-xs font-medium text-primary">
              Kein US-Datenfluss
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Europäische LLM-Provider, DSGVO von Anfang an. Einige Features
              eingeschränkt, weil sie auf US-APIs angewiesen sind.
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <Check>EU-Modelle (Mistral, IONOS)</Check>
              <Check>PII-Erkennung, Maskierung, Consent-Logging</Check>
              <Excluded>
                Kein Google Grounding, kein Gemini TTS/Bilder
              </Excluded>
            </ul>
          </div>

          {/* Self-Hosted */}
          <div className="rounded-xl border border-border bg-card p-6">
            <div className="mb-1 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted">
                <Server className="h-3.5 w-3.5 text-primary" />
              </div>
              <h3 className="font-bold">Self-Hosted</h3>
            </div>
            <p className="mb-3 text-xs font-medium text-primary">
              Maximale Datensouveränität
            </p>
            <p className="mb-4 text-sm text-muted-foreground">
              Alles auf eurer Infrastruktur. Chat, Experten, Skills, Projekte
              funktionieren komplett lokal. Web-abhängige Tools entfallen.
            </p>
            <ul className="space-y-1.5 text-xs text-muted-foreground">
              <Check>Docker Compose, Ollama, lokale Modelle</Check>
              <Check>Air-Gapped möglich</Check>
              <Excluded>
                Keine Websuche, kein YouTube, keine externen APIs
              </Excluded>
            </ul>
          </div>
        </div>

        <p className="mb-12 rounded-lg bg-background/60 p-4 text-sm text-muted-foreground">
          Die Faustregel: Je mehr Datensouveränität, desto weniger externe
          Werkzeuge. Der Kern — Chat, Experten, Skills, Projekte, Artifacts,
          Memory, Datenschutz — funktioniert in jedem Modus.
        </p>

        <h3 className="mb-4 text-xl font-bold">
          Eine Codebase, beliebig viele Instanzen
        </h3>
        <p className="mb-6 text-muted-foreground">
          Jede Instanz hat eigenes Branding, eigene Domain, eigene Features
          und eigene Datenbank. 21 Feature-Flags steuern granular was aktiv
          ist. Neue Instanz = neues Deployment mit eigenen
          Environment-Variablen. Kein Fork, kein Branch.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <MonitorSmartphone className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">White-Label</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Eigene Farben, eigene Domain, eigenes Logo. Die Plattform sieht
              aus wie euer Produkt.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Feature-Konfiguration</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              21 Flags steuern welche Tools, welche Provider und welche
              UI-Elemente aktiv sind. Per Environment-Variable.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2">
              <Settings className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Admin-Verwaltung</h4>
            </div>
            <p className="text-xs text-muted-foreground">
              Skills, Experts, Modelle, Credits und User. Alles über eine
              Admin-UI steuerbar. Kein Code-Zugang nötig.
            </p>
          </div>
        </div>
      </Band>

      {/* ═══ WAS HEUTE FUNKTIONIERT ═══ */}
      <Band>
        <SectionLabel>Status</SectionLabel>
        <h2 className="mb-4 text-xl font-bold sm:text-2xl md:text-3xl">
          Was heute funktioniert
        </h2>
        <p className="mb-10 max-w-2xl text-muted-foreground">
          Keine Roadmap-Versprechen. Alles implementiert, deployed, im
          Einsatz.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-bold">Chat und Kontext</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <Check>Streaming-Chat mit Persistenz</Check>
              <Check>7 spezialisierte KI-Experten</Check>
              <Check>Quicktask-Formulare</Check>
              <Check>On-demand Skill-Loading</Check>
              <Check>Persistentes Memory</Check>
              <Check>Projekt-Kontext und Dokumente</Check>
              <Check>Custom Instructions</Check>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-bold">Werkzeuge und Outputs</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <Check>Deep Research mit Quellen</Check>
              <Check>Google Search Grounding</Check>
              <Check>Websuche (5 Provider)</Check>
              <Check>Bildgenerierung + Design Library</Check>
              <Check>UI-Design-Generierung</Check>
              <Check>YouTube-Suche und Analyse</Check>
              <Check>Text-to-Speech (8 Stimmen)</Check>
              <Check>Office-Dokumente (PPTX, XLSX, DOCX, PDF)</Check>
              <Check>Session-Wrapup (Text + Audio)</Check>
            </ul>
          </div>
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="mb-4 font-bold">Plattform</h3>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              <Check>Collaboration und Chat-Sharing</Check>
              <Check>User Workspace mit KI-Wizard</Check>
              <Check>Credit-System mit Audit-Log</Check>
              <Check>PII-Erkennung + Maskierung</Check>
              <Check>EU- und Self-Hosted Deployment</Check>
              <Check>Multi-Instanz mit Branding</Check>
              <Check>21 Feature-Flags</Check>
              <Check>Admin-UI für alles</Check>
              <Check>MCP für externe Tools</Check>
            </ul>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {[
            "Next.js 16",
            "TypeScript Strict",
            "Tailwind CSS v4",
            "Vercel AI SDK",
            "Neon Postgres",
            "Drizzle ORM",
            "Logto Auth",
            "S3 Storage",
            "Mem0",
          ].map((tech) => (
            <span
              key={tech}
              className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs text-muted-foreground"
            >
              {tech}
            </span>
          ))}
        </div>
      </Band>

      {/* ═══ ZWEI CTAs ═══ */}
      <Band muted>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-border bg-card p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Ausprobieren</h2>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Registriere dich und probier die Plattform aus. Nach der
              Registrierung schaltet ein Admin deinen Zugang frei.
            </p>
            <div className="flex flex-col gap-3">
              <a
                href="/api/auth/sign-in"
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <ArrowRight className="h-4 w-4" />
                Jetzt registrieren
              </a>
              <a
                href="mailto:hallo@loschke.ai"
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                <Mail className="h-4 w-4" />
                Fragen? hallo@loschke.ai
              </a>
            </div>
          </div>

          <div className="rounded-xl border border-primary/30 bg-primary/5 p-6 sm:p-8">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                <Wrench className="h-4 w-4 text-primary" />
              </div>
              <h2 className="text-xl font-bold">Mitbauen</h2>
            </div>
            <p className="mb-6 text-sm text-muted-foreground">
              Bisher ein Solo-Projekt. Die Technologie steht, aber es braucht
              mehr als eine Person. Entwickler, Designer, Product-Leute. Wenn
              dich das Problem interessiert und du mitgestalten willst, lass
              uns reden.
            </p>
            <a
              href="mailto:hallo@loschke.ai"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
            >
              <Mail className="h-4 w-4" />
              hallo@loschke.ai
            </a>
          </div>
        </div>

        <p className="mt-10 text-center text-sm text-muted-foreground">
          Rico Loschke — AI Transformation Consultant, Dresden
        </p>
      </Band>
    </div>
  )
}
