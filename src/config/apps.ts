import { Palette, MessageSquare, Film } from "lucide-react"
import type { AppLink } from "@/types"

export const apps: AppLink[] = [
  {
    name: "AI-Design",
    url: "https://ai-design.lernen.diy",
    icon: Palette,
    description: "KI-Bildgenerierung lernen",
    active: true,
  },
  {
    name: "Prompt Engineering",
    url: "https://prompts.lernen.diy",
    icon: MessageSquare,
    description: "Effektive Prompts schreiben",
  },
  {
    name: "AI-Video",
    url: "https://ai-video.lernen.diy",
    icon: Film,
    description: "KI-Videos erstellen",
  },
]

export const currentApp = apps.find((app) => app.active) ?? apps[0]
