"use client"

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react"

import { useSidebar } from "@/components/ui/sidebar"
import { features } from "@/config/features"

interface ChatContextValue {
  isOpen: boolean
  toggle: () => void
  close: () => void
}

const ChatContext = createContext<ChatContextValue | null>(null)

export function useChatPanel() {
  const ctx = useContext(ChatContext)
  if (!ctx) {
    throw new Error("useChatPanel must be used within ChatProvider")
  }
  return ctx
}

interface ChatProviderProps {
  children: ReactNode
}

export function ChatProvider({ children }: ChatProviderProps) {
  if (!features.chat.enabled) {
    return <>{children}</>
  }

  return <ChatProviderInner>{children}</ChatProviderInner>
}

function ChatProviderInner({ children }: ChatProviderProps) {
  const [isOpen, setIsOpen] = useState(false)
  const { setOpen: setSidebarOpen } = useSidebar()
  // Merkt sich ob die Sidebar vor dem Öffnen expanded war
  const sidebarWasOpen = useRef(true)

  const toggle = useCallback(() => {
    setIsOpen((prev) => {
      const willOpen = !prev
      if (willOpen) {
        // Chat öffnet → Sidebar-Zustand merken und einklappen
        const sidebarOpen =
          document.querySelector("[data-state='expanded']") !== null
        sidebarWasOpen.current = sidebarOpen
        setSidebarOpen(false)
      } else {
        // Chat schließt → Sidebar wiederherstellen
        if (sidebarWasOpen.current) {
          setSidebarOpen(true)
        }
      }
      return willOpen
    })
  }, [setSidebarOpen])

  const close = useCallback(() => {
    setIsOpen(false)
    // Sidebar wiederherstellen
    if (sidebarWasOpen.current) {
      setSidebarOpen(true)
    }
  }, [setSidebarOpen])

  return (
    <ChatContext value={{ isOpen, toggle, close }}>
      {children}
    </ChatContext>
  )
}
