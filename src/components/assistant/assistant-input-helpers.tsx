"use client"

import { Paperclip } from "lucide-react"

import {
  PromptInputButton,
  PromptInputHeader,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input"
import {
  Attachments,
  Attachment,
  AttachmentPreview,
  AttachmentRemove,
} from "@/components/ai-elements/attachments"

export function UploadButton() {
  const attachments = usePromptInputAttachments()

  return (
    <PromptInputButton
      tooltip="Datei anhaengen"
      onClick={() => attachments.openFileDialog()}
    >
      <Paperclip className="size-4" />
    </PromptInputButton>
  )
}

export function AttachmentPreviews() {
  const attachments = usePromptInputAttachments()

  if (attachments.files.length === 0) return null

  return (
    <PromptInputHeader>
      <Attachments variant="grid">
        {attachments.files.map((file) => (
          <Attachment
            key={file.id}
            data={file}
            onRemove={() => attachments.remove(file.id)}
          >
            <AttachmentPreview />
            <AttachmentRemove />
          </Attachment>
        ))}
      </Attachments>
    </PromptInputHeader>
  )
}
