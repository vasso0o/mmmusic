import { NextResponse } from "next/server"
import { Innertube, UniversalCache, YTNodes } from "youtubei.js"
import { auth } from "@/lib/auth"
import { ROUND_PLATFORMS, type RoundPlatform } from "@/lib/round-types"

type SongSearchResult = {
  id: string
  url: string
  title: string
  artist: string
  thumbnail?: string
}

const MAX_RESULTS = 8
const MAX_QUERY_LENGTH = 100
const UPSTREAM_TIMEOUT_MS = 8_000
let youtubeClientPromise: Promise<Innertube> | undefined

function getYouTubeClient() {
  if (!youtubeClientPromise) {
    youtubeClientPromise = Innertube.create({
      cache: new UniversalCache(false),
      enable_session_cache: true,
      generate_session_locally: true,
      retrieve_player: false,
    }).catch((error: unknown) => {
      youtubeClientPromise = undefined
      throw error
    })
  }

  return youtubeClientPromise
}

function isRoundPlatform(value: string | null): value is RoundPlatform {
  return ROUND_PLATFORMS.some((platform) => platform === value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function toSafeHttpsUrl(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined

  try {
    const url = new URL(value)
    return url.protocol === "https:" ? url.toString() : undefined
  } catch {
    return undefined
  }
}

async function searchYouTube(query: string): Promise<SongSearchResult[]> {
  const youtube = await getYouTubeClient()
  const search = await youtube.search(query, { type: "video" })
  const videos = search.results
    .filterType(YTNodes.Video, YTNodes.CompactVideo)
    .slice(0, MAX_RESULTS)

  return videos.map((video) => {
    const thumbnail = video.thumbnails
      .map((item) => toSafeHttpsUrl(item.url))
      .find((url) => url !== undefined)

    return {
      id: video.video_id,
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(video.video_id)}`,
      title: video.title.toString(),
      artist: video.author.name,
      ...(thumbnail ? { thumbnail } : {}),
    }
  })
}

async function searchSoundCloud(
  query: string,
  clientId: string
): Promise<SongSearchResult[]> {
  const params = new URLSearchParams({
    client_id: clientId,
    q: query,
    limit: String(MAX_RESULTS),
  })
  const response = await fetch(
    `https://api-v2.soundcloud.com/search/tracks?${params}`,
    { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) }
  )
  if (!response.ok) {
    console.error("SoundCloud song search failed with status:", response.status)
    throw new Error("SoundCloud search provider failed.")
  }

  const body: unknown = await response.json()
  if (!isRecord(body) || !Array.isArray(body.collection)) {
    throw new Error("SoundCloud returned an invalid search response.")
  }

  return body.collection.flatMap((item): SongSearchResult[] => {
    if (!isRecord(item) || !isRecord(item.user)) return []
    const id = item.id
    const title = item.title
    const artist = item.user.username
    const url = toSafeHttpsUrl(item.permalink_url)
    if (
      (typeof id !== "string" && typeof id !== "number") ||
      typeof title !== "string" ||
      typeof artist !== "string" ||
      !url
    ) {
      return []
    }

    const artwork = toSafeHttpsUrl(item.artwork_url)
    return [
      {
        id: String(id),
        url,
        title,
        artist,
        ...(artwork ? { thumbnail: artwork } : {}),
      },
    ]
  })
}

export async function GET(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const platform = searchParams.get("platform")
  const query = searchParams.get("q")?.trim() ?? ""

  if (!isRoundPlatform(platform) || platform === "OTHER") {
    return NextResponse.json(
      { error: "Choose YouTube or SoundCloud to search." },
      { status: 400 }
    )
  }
  if (query.length < 2 || query.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: "Search query must be between 2 and 100 characters." },
      { status: 400 }
    )
  }

  try {
    let results: SongSearchResult[]
    if (platform === "YOUTUBE") {
      results = await searchYouTube(query)
    } else {
      const clientId = process.env.SOUNDCLOUD_CLIENT_ID
      if (!clientId) {
        return NextResponse.json(
          { error: "SOUNDCLOUD_CLIENT_ID is not configured." },
          { status: 503 }
        )
      }
      results = await searchSoundCloud(query, clientId)
    }
    return NextResponse.json({ results })
  } catch (error) {
    console.error("Song search failed:", error)
    return NextResponse.json(
      { error: "Song search is temporarily unavailable." },
      { status: 502 }
    )
  }
}
