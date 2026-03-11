import { Sparkles, Camera, Target, BookOpen, HelpCircle, MessageSquare } from "lucide-react"
import type { NavItem, ModuleItem } from "@/types"

export const primaryModules: ModuleItem[] = [
  {
    title: "4K Framework",
    url: "/module-1",
    icon: Sparkles,
    description: "Grundlagen der KI-Bildgenerierung",
    badge: "Neu",
    chatContext: "4k-framework",
  },
  {
    title: "Kamera Sandbox",
    url: "/module-2",
    icon: Camera,
    description: "Experimentiere mit Kameraeinstellungen",
    chatContext: "kamera-sandbox",
  },
  {
    title: "Übungen",
    url: "/module-3",
    icon: Target,
    description: "Praktische Aufgaben",
    chatContext: "uebungen",
  },
]

export const secondaryNavigation: NavItem[] = [
  {
    title: "Assistent",
    url: "/assistant",
    icon: MessageSquare,
  },
  {
    title: "Dokumentation",
    url: "/docs",
    icon: BookOpen,
  },
  {
    title: "Hilfe & FAQ",
    url: "/help",
    icon: HelpCircle,
  },
]
