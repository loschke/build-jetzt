import type { OutputFormat } from "@/types/artifact"

/** All available output formats. Order = display order in picker. */
export function getAvailableFormats(): OutputFormat[] {
  const formats: OutputFormat[] = [
    {
      id: "document",
      label: "Dokument",
      description: "Strukturierter Markdown-Text",
      contentType: "markdown",
      icon: "FileText",
      fileExtension: "md",
      skillId: null,
    },
  ]

  // Carousel: only when Skill ID is set
  if (process.env.CAROUSEL_SKILL_ID) {
    formats.push({
      id: "carousel",
      label: "Carousel",
      description: "LinkedIn Carousel (HTML Slides)",
      contentType: "html",
      icon: "GalleryHorizontalEnd",
      fileExtension: "html",
      skillId: process.env.CAROUSEL_SKILL_ID,
      maxTokens: 16384,
    })
  }

  return formats
}
