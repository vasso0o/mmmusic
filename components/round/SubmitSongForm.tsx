"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { submitSong } from "@/app/(main)/leagues/round-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROUND_PLATFORMS, type RoundPlatform } from "@/lib/round-types"

type ExistingSubmission = {
  url: string
  platform: RoundPlatform
  title: string | null
  artist: string | null
  pitch: string | null
}

export function SubmitSongForm({
  leagueId,
  roundId,
  existingSubmission,
}: {
  leagueId: string
  roundId: string
  existingSubmission: ExistingSubmission | null
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await submitSong(leagueId, roundId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/leagues/${leagueId}/rounds/${roundId}`)
      router.refresh()
    })
  }

  return (
    <form action={onSubmit} className="space-y-4 rounded-xl border p-5">
      <div className="space-y-2">
        <label htmlFor="song-url" className="text-sm font-medium">
          Song URL
        </label>
        <Input
          id="song-url"
          name="url"
          type="url"
          required
          maxLength={2048}
          defaultValue={existingSubmission?.url}
          placeholder="https://..."
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="song-platform" className="text-sm font-medium">
          Platform
        </label>
        <select
          id="song-platform"
          name="platform"
          required
          defaultValue={existingSubmission?.platform ?? ""}
          className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Select a platform
          </option>
          <option value={ROUND_PLATFORMS[0]}>YouTube</option>
          <option value={ROUND_PLATFORMS[1]}>SoundCloud</option>
          <option value={ROUND_PLATFORMS[2]}>Other</option>
        </select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="song-title" className="text-sm font-medium">
            Track title (optional)
          </label>
          <Input
            id="song-title"
            name="title"
            maxLength={200}
            defaultValue={existingSubmission?.title ?? ""}
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="song-artist" className="text-sm font-medium">
            Artist (optional)
          </label>
          <Input
            id="song-artist"
            name="artist"
            maxLength={200}
            defaultValue={existingSubmission?.artist ?? ""}
          />
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="song-pitch" className="text-sm font-medium">
          Why this song? (optional)
        </label>
        <textarea
          id="song-pitch"
          name="pitch"
          maxLength={1000}
          rows={3}
          defaultValue={existingSubmission?.pitch ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending
          ? "Saving..."
          : existingSubmission
            ? "Update submission"
            : "Submit song"}
      </Button>
    </form>
  )
}
