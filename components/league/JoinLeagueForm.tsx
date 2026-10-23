"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { joinLeague } from "@/app/(main)/leagues/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function JoinLeagueForm({ leagueId }: { leagueId: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await joinLeague(leagueId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }

      router.refresh()
    })
  }

  return (
    <form action={onSubmit} className="mt-6 max-w-sm space-y-4">
      <div className="space-y-2">
        <label htmlFor="join-league-password" className="text-sm font-medium">
          League Password
        </label>
        <Input
          id="join-league-password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          placeholder="Enter password to join"
        />
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending}>
        {isPending ? "Joining..." : "Join League"}
      </Button>
    </form>
  )
}
