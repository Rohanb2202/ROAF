// Tenor GIF API client

const TENOR_API_URL = "https://tenor.googleapis.com/v2"

export interface TenorGif {
  id: string
  title: string
  url: string
  preview: string
  width: number
  height: number
}

interface TenorMediaFormat {
  url: string
  dims: [number, number]
  size: number
}

interface TenorResult {
  id: string
  title: string
  media_formats: {
    gif: TenorMediaFormat
    tinygif: TenorMediaFormat
    nanogif: TenorMediaFormat
  }
}

interface TenorResponse {
  results: TenorResult[]
  next: string
}

function getApiKey(): string {
  return process.env.NEXT_PUBLIC_TENOR_API_KEY || ""
}

function formatResult(result: TenorResult): TenorGif {
  const gif = result.media_formats.gif
  const preview = result.media_formats.tinygif || result.media_formats.nanogif

  return {
    id: result.id,
    title: result.title,
    url: gif.url,
    preview: preview?.url || gif.url,
    width: gif.dims[0],
    height: gif.dims[1],
  }
}

export async function searchGifs(query: string, limit = 20): Promise<TenorGif[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn("Tenor API key not configured")
    return []
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      q: query,
      limit: limit.toString(),
      media_filter: "gif,tinygif,nanogif",
      contentfilter: "medium",
    })

    const response = await fetch(`${TENOR_API_URL}/search?${params}`)
    if (!response.ok) throw new Error("Failed to search GIFs")

    const data: TenorResponse = await response.json()
    return data.results.map(formatResult)
  } catch (error) {
    console.error("Tenor search error:", error)
    return []
  }
}

export async function getTrendingGifs(limit = 20): Promise<TenorGif[]> {
  const apiKey = getApiKey()
  if (!apiKey) {
    console.warn("Tenor API key not configured")
    return []
  }

  try {
    const params = new URLSearchParams({
      key: apiKey,
      limit: limit.toString(),
      media_filter: "gif,tinygif,nanogif",
      contentfilter: "medium",
    })

    const response = await fetch(`${TENOR_API_URL}/featured?${params}`)
    if (!response.ok) throw new Error("Failed to get trending GIFs")

    const data: TenorResponse = await response.json()
    return data.results.map(formatResult)
  } catch (error) {
    console.error("Tenor trending error:", error)
    return []
  }
}

export async function getGifCategories(): Promise<string[]> {
  const apiKey = getApiKey()
  if (!apiKey) return []

  try {
    const params = new URLSearchParams({
      key: apiKey,
      type: "trending",
    })

    const response = await fetch(`${TENOR_API_URL}/categories?${params}`)
    if (!response.ok) throw new Error("Failed to get categories")

    const data = await response.json()
    return data.tags?.map((t: { searchterm: string }) => t.searchterm) || []
  } catch (error) {
    console.error("Tenor categories error:", error)
    return []
  }
}
