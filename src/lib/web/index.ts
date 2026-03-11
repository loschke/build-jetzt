import Firecrawl from "@mendable/firecrawl-js"

import type {
  WebSearchParams,
  WebSearchResponse,
  WebScrapeParams,
  WebScrapeResponse,
  WebCrawlParams,
  WebCrawlResponse,
  WebCrawlJob,
  WebBatchScrapeParams,
  WebBatchScrapeResponse,
  WebExtractParams,
  WebExtractResponse,
  WebMapParams,
  WebMapResponse,
} from "./types"

function getClient(): Firecrawl {
  const apiKey = process.env.FIRECRAWL_API_KEY
  if (!apiKey) throw new Error("FIRECRAWL_API_KEY nicht gesetzt.")
  return new Firecrawl({ apiKey })
}

/**
 * Web search via Firecrawl.
 * Returns web results. Each result may include scraped markdown if scrapeOptions provided.
 * Credits: ~2 per 10 results.
 */
export async function webSearch(
  params: WebSearchParams
): Promise<WebSearchResponse> {
  const client = getClient()
  // SearchData has .web, .news, .images arrays
  const result = await client.search(params.query, {
    limit: params.limit,
    location: params.location,
    scrapeOptions: params.scrapeOptions,
  })

  // SearchData.web is Array<SearchResultWeb | Document>
  // SearchResultWeb has url, title?, description?
  // Document (when scrapeOptions used) has markdown?, html?, metadata?
  const items = result.web ?? []

  return {
    data: items.map((item) => ({
      url: "url" in item ? (item.url ?? "") : "",
      title: ("title" in item ? item.title : undefined) ?? "",
      description: ("description" in item ? item.description : undefined) ?? "",
      markdown: "markdown" in item ? item.markdown : undefined,
    })),
  }
}

/**
 * Scrape a single URL to markdown/HTML.
 * Credits: 1 per page.
 */
export async function webScrape(
  params: WebScrapeParams
): Promise<WebScrapeResponse> {
  const client = getClient()
  // Returns Document directly
  const result = await client.scrape(params.url, {
    formats: params.formats,
    onlyMainContent: params.onlyMainContent,
    waitFor: params.waitFor,
  })

  return {
    markdown: result.markdown,
    html: result.html,
    metadata: result.metadata as Record<string, unknown> | undefined,
  }
}

/**
 * Crawl a website (blocking). Waits until all pages are scraped.
 * Credits: 1 per page crawled.
 */
export async function webCrawl(
  params: WebCrawlParams
): Promise<WebCrawlResponse> {
  const client = getClient()
  // Returns CrawlJob: { id, status, total, completed, data: Document[] }
  const result = await client.crawl(params.url, {
    limit: params.limit,
    maxDiscoveryDepth: params.maxDepth,
    includePaths: params.includePaths,
    excludePaths: params.excludePaths,
    scrapeOptions: params.scrapeOptions,
  })

  return {
    status: result.status,
    total: result.total,
    completed: result.completed,
    data: result.data.map((page) => ({
      markdown: page.markdown,
      html: page.html,
      metadata: page.metadata as Record<string, unknown> | undefined,
    })),
  }
}

/**
 * Start a crawl job without waiting. Returns a job ID for status polling.
 */
export async function webCrawlAsync(
  params: WebCrawlParams
): Promise<WebCrawlJob> {
  const client = getClient()
  // Returns CrawlResponse: { id, url }
  const result = await client.startCrawl(params.url, {
    limit: params.limit,
    maxDiscoveryDepth: params.maxDepth,
    includePaths: params.includePaths,
    excludePaths: params.excludePaths,
    scrapeOptions: params.scrapeOptions,
  })

  return { id: result.id }
}

/**
 * Check the status of an async crawl job.
 */
export async function webCrawlStatus(
  jobId: string
): Promise<WebCrawlResponse> {
  const client = getClient()
  // Returns CrawlJob
  const result = await client.getCrawlStatus(jobId)

  return {
    status: result.status,
    total: result.total,
    completed: result.completed,
    data: result.data.map((page) => ({
      markdown: page.markdown,
      html: page.html,
      metadata: page.metadata as Record<string, unknown> | undefined,
    })),
  }
}

/**
 * Batch scrape multiple URLs at once.
 * Credits: 1 per URL.
 */
export async function webBatchScrape(
  params: WebBatchScrapeParams
): Promise<WebBatchScrapeResponse> {
  const client = getClient()
  // Returns BatchScrapeJob: { id, status, total, completed, data: Document[] }
  const result = await client.batchScrape(params.urls, {
    options: params.formats ? { formats: params.formats } : undefined,
  })

  return {
    status: result.status,
    total: result.total,
    completed: result.completed,
    data: result.data.map((page) => ({
      markdown: page.markdown,
      html: page.html,
      metadata: page.metadata as Record<string, unknown> | undefined,
    })),
  }
}

/**
 * Extract structured data from URLs using LLM.
 * Credits: 5 per URL.
 */
export async function webExtract(
  params: WebExtractParams
): Promise<WebExtractResponse> {
  const client = getClient()
  // Returns ExtractResponse: { success?, data?, status?, error? }
  const result = await client.extract({
    urls: params.urls,
    prompt: params.prompt,
    schema: params.schema,
  })

  return {
    success: result.success ?? false,
    data: result.data ?? {},
  }
}

/**
 * Discover all URLs on a website (sitemap generation).
 * Credits: 1 per call.
 */
export async function webMap(params: WebMapParams): Promise<WebMapResponse> {
  const client = getClient()
  // Returns MapData: { links: SearchResultWeb[] }
  const result = await client.map(params.url, {
    search: params.search,
    limit: params.limit,
  })

  return {
    links: result.links.map((link) => ({
      url: link.url,
      title: link.title ?? "",
      description: link.description ?? "",
    })),
  }
}
