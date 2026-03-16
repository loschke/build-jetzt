import {
  Sparkles,
  Code,
  Search,
  BarChart3,
  BookOpen,
  PenLine,
  Bot,
  Users,
  type LucideIcon,
} from "lucide-react"

/** Shared icon map for expert icons. Used by expert-selector, chat-header, etc. */
export const EXPERT_ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Code,
  Search,
  BarChart3,
  BookOpen,
  PenLine,
  Bot,
  Users,
}

/** Default fallback icon for experts. */
export const DEFAULT_EXPERT_ICON: LucideIcon = Bot
