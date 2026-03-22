export type BrandId = "lernen" | "unlearn" | "loschke" | "prototype" | "aok"

export interface BrandConfig {
  id: BrandId
  name: string
  description: string
  domain: string
}

const brands: Record<BrandId, BrandConfig> = {
  lernen: {
    id: "lernen",
    name: "lernen.diy",
    description: "Praxisorientierte KI-Lernmodule",
    domain: "lernen.diy",
  },
  unlearn: {
    id: "unlearn",
    name: "unlearn.how",
    description: "KI-Beratung und Workshops",
    domain: "unlearn.how",
  },
  loschke: {
    id: "loschke",
    name: "loschke.ai",
    description: "AI Transformation Insights",
    domain: "loschke.ai",
  },
  prototype: {
    id: "prototype",
    name: "Build.jetzt",
    description: "Prototyp-Anwendung",
    domain: "build.jetzt",
  },
  aok: {
    id: "aok",
    name: "AOK",
    description: "AOK Lernplattform",
    domain: "aok.lernen.diy",
  },
}

const brandId = (process.env.NEXT_PUBLIC_BRAND ?? "lernen") as BrandId

export const brand: BrandConfig = brands[brandId] ?? brands.lernen
