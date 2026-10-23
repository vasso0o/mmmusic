"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { createRound } from "@/app/(main)/leagues/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function CreateRoundForm({ leagueId }: { leagueId: string }) {
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)
  const router = useRouter()

  async function onSubmit(formData: FormData) {
    setError(null)

    try {
      for (const field of ["submitDeadline", "voteDeadline"]) {
        const value = formData.get(field)
        if (typeof value !== "string" || !value) {
          setError("Enter valid submission and voting deadlines.")
          return
        }

        const deadline = new Date(value)
        if (Number.isNaN(deadline.getTime())) {
          setError("Enter valid submission and voting deadlines.")
          return
        }

        formData.set(field, deadline.toISOString())
      }

      setIsPending(true)
      const result = await createRound(leagueId, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push(`/leagues/${leagueId}`)
    } catch (submissionError) {
      console.error("Create round submission failed:", submissionError)
      setError("Could not create the round. Please try again.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <form
      action={onSubmit}
      className="space-y-4 rounded-lg border bg-muted/20 p-4"
    >
      <div className="space-y-2">
        <label htmlFor="round-theme" className="text-sm font-medium">
          Theme
        </label>
        <Input
          id="round-theme"
          name="theme"
          required
          minLength={3}
          maxLength={100}
          placeholder="e.g. 90s Hip Hop"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="round-description" className="text-sm font-medium">
          Description (Optional)
        </label>
        <textarea
          id="round-description"
          name="themeDesc"
          maxLength={1000}
          rows={3}
          placeholder="Rules or extra details..."
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="round-submit-deadline" className="text-sm font-medium">
            Submit Deadline
          </label>
          <Input
            id="round-submit-deadline"
            name="submitDeadline"
            type="datetime-local"
            required
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="round-vote-deadline" className="text-sm font-medium">
            Vote Deadline
          </label>
          <Input
            id="round-vote-deadline"
            name="voteDeadline"
            type="datetime-local"
            required
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Round"}
        </Button>
        <Button
          variant="ghost"
          disabled={isPending}
          nativeButton={false}
          render={<Link href={`/leagues/${leagueId}`} />}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
