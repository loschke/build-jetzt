import { redirect } from "next/navigation"

import { features } from "@/config/features"
import { getAvailableFormats } from "@/config/formats"
import { listExperts } from "@/lib/assistant/list-experts"
import { AssistantChat } from "@/components/assistant/assistant-chat"

export default async function AssistantPage() {
  if (!features.assistant.enabled) {
    redirect("/")
  }

  const experts = await listExperts()
  const formats = getAvailableFormats()

  return (
    <div className="-m-6 flex h-[calc(100vh-var(--header-height,56px))] w-[calc(100%+3rem)]">
      <AssistantChat experts={experts} availableFormats={formats} />
    </div>
  )
}
