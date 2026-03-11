import type { FormatOption } from "@mendable/firecrawl-js"

export type { FormatOption }

// --- Search ---

export interface WebSearchParams {
  query: string
  limit?: number
  location?: string
  scrapeOptions?: {
    formats?: FormatOption[]
  }
}

export interface WebSearchResult {
  url: string
  title: string
  description: string
  markdown?: string
}

export interface WebSearchResponse {
  data: WebSearchResult[]
}

// --- Scrape ---

export interface WebScrapeParams {
  url: string
  formats?: FormatOption[]
  onlyMainContent?: boolean
  waitFor?: number
}

export interface WebScrapeResponse {
  markdown?: string
  html?: string
  metadata?: Record<string, unknown>
}

// --- Crawl ---

export interface WebCrawlParams {
  url: string
  limit?: number
  maxDepth?: number
  includePaths?: string[]
  excludePaths?: string[]
  scrapeOptions?: {
    formats?: FormatOption[]
  }
}

export interface WebCrawlPage {
  markdown?: string
  html?: string
  metadata?: Record<string, unknown>
}

export interface WebCrawlResponse {
  status: string
  total: number
  completed: number
  data: WebCrawlPage[]
}

export interface WebCrawlJob {
  id: string
}

// --- Batch Scrape ---

export interface WebBatchScrapeParams {
  urls: string[]
  formats?: FormatOption[]
}

export interface WebBatchScrapeResponse {
  status: string
  total: number
  completed: number
  data: WebCrawlPage[]
}

// --- Extract ---

export interface WebExtractParams {
  urls: string[]
  prompt: string
  schema?: Record<string, unknown>
}

export interface WebExtractResponse {
  success: boolean
  data: unknown
}

// --- Map ---

export interface WebMapParams {
  url: string
  search?: string
  limit?: number
}

export interface WebMapResponse {
  links: WebSearchResult[]
}
