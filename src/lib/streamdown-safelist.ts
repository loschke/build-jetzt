/**
 * Streamdown Tailwind Safelist
 *
 * Streamdown rendert Code-Blöcke, Bilder und Diagramme mit Tailwind-Klassen
 * zur Laufzeit. Da die Klassen aus node_modules kommen und Tailwind diese
 * Dateien nicht automatisch scannt, sind sie hier als Strings referenziert.
 *
 * Die @source-Direktive fuer node_modules loest einen Turbopack-Crash auf
 * Windows aus (versucht "nul" als Datei zu lesen). Dieses File ist die
 * Workaround-Loesung: Tailwind scannt src/ automatisch und generiert
 * alle hier referenzierten Klassen.
 *
 * NICHT IMPORTIEREN — existiert nur fuer Tailwind's Content Scanner.
 */

// Code Block Container
const _codeBlock = `
  my-4 flex w-full flex-col gap-2 rounded-xl border border-border bg-sidebar p-2
  overflow-hidden rounded-md bg-background p-4 text-sm
  content-visibility-[auto] contain-intrinsic-size-[auto_200px]
`

// Code Block Header
const _codeBlockHeader = `
  flex h-8 items-center text-muted-foreground text-xs ml-1 font-mono lowercase
`

// Code Block Actions (Copy/Download buttons)
const _codeBlockActions = `
  pointer-events-none pointer-events-auto sticky top-2 z-10 -mt-10
  justify-end shrink-0 px-1.5 py-1
  bg-sidebar/80 border-sidebar
  supports-[backdrop-filter]:bg-sidebar/70 supports-[backdrop-filter]:backdrop-blur
  cursor-pointer p-1 transition-all
  disabled:cursor-not-allowed disabled:opacity-50
  hover:text-foreground
`

// Code Block Line Numbers (Shiki syntax highlighting)
const _codeLineNumbers = `
  before:content-[counter(line)] before:inline-block before:[counter-increment:line]
  before:w-6 before:mr-4 before:text-right before:text-muted-foreground/50
  before:font-mono before:select-none before:text-[13px]
  [counter-increment:line_0] [counter-reset:line]
`

// Code Block Loading State
const _codeBlockLoading = `
  divide-y divide-border bg-muted/80 h-[46px] animate-spin
`

// Image Component
const _imageComponent = `
  inline-block max-w-full rounded-lg group relative
  right-2 bottom-2 h-8 w-8 bg-background/90 shadow-sm backdrop-blur-sm
  opacity-0 group-hover:opacity-100 group-hover:block
  bg-black/10
`

// Link Safety Modal
const _linkSafetyModal = `
  fixed inset-0 z-50 bg-background/50 backdrop-blur-sm bg-background/95
  max-w-md shadow-lg break-all max-h-32 overflow-y-auto
  bg-primary text-primary-foreground hover:bg-primary/90
  hover:bg-muted
`

// Mermaid Diagram
const _mermaidDiagram = `
  min-w-[120px] top-full right-0 mt-1 hover:bg-muted/40
`

// Prevent tree-shaking (never actually called)
void _codeBlock
void _codeBlockHeader
void _codeBlockActions
void _codeLineNumbers
void _codeBlockLoading
void _imageComponent
void _linkSafetyModal
void _mermaidDiagram
