"use client"

import { ExternalLink } from "lucide-react"
import type { RoundPlatform } from "@/lib/round-types"

const platformLabels: Record<RoundPlatform, string> = {
  YOUTUBE: "YouTube",
  SOUNDCLOUD: "SoundCloud",
}

export function SongEmbed({
  url,
  platform,
}: {
  url: string
  platform: RoundPlatform
}) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
    >
      Listen on {platformLabels[platform]}
      <ExternalLink className="size-4" aria-hidden="true" />
    </a>
  )
}