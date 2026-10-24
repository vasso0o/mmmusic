"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SongEmbed } from "@/components/round/SongEmbed"
import type { RoundPlatform } from "@/lib/round-types"

export type SubmissionCardData = {
  id: string
  url: string
  platform: RoundPlatform
  title: string | null
  artist: string | null
  pitch: string | null
  user?: { name: string } | null
}

export function SubmissionCard({
  submission,
  children,
}: {
  submission: SubmissionCardData
  children?: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {submission.title || submission.artist
            ? [submission.title, submission.artist].filter(Boolean).join(" — ")
            : "Untitled song"}
        </CardTitle>
        {submission.user && (
          <p className="text-sm text-muted-foreground">
            Submitted by {submission.user.name}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {submission.pitch && (
          <p className="whitespace-pre-wrap text-sm">{submission.pitch}</p>
        )}
        <SongEmbed url={submission.url} platform={submission.platform} />
        {children}
      </CardContent>
    </Card>
  )
}