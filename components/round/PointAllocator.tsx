"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { castVote } from "@/app/(main)/leagues/round-actions"
import { SubmissionCard, type SubmissionCardData } from "@/components/round/SubmissionCard"
import { Button } from "@/components/ui/button"

type VoteSubmission = SubmissionCardData & {
  initialPoints: number
  initialComment: string
}

export function PointAllocator({
  leagueId,
  roundId,
  submissions,
  pointBudget,
  allowDownvotes,
}: {
  leagueId: string
  roundId: string
  submissions: VoteSubmission[]
  pointBudget: number
  allowDownvotes: boolean
}) {
  const router = useRouter()
  const [pendingSubmission, setPendingSubmission] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [points, setPoints] = useState<Record<string, number>>(() =>
    Object.fromEntries(
      submissions.map((submission) => [
        submission.id,
        submission.initialPoints,
      ])
    )
  )
  const [comments, setComments] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      submissions.map((submission) => [
        submission.id,
        submission.initialComment,
      ])
    )
  )
  const spent = Object.values(points).reduce(
    (sum, value) => sum + Math.abs(value),
    0
  )

  function saveVote(submissionId: string) {
    setPendingSubmission(submissionId)
    setErrors((current) => ({ ...current, [submissionId]: "" }))
    startTransition(async () => {
      const result = await castVote(
        leagueId,
        roundId,
        submissionId,
        points[submissionId] ?? 0,
        comments[submissionId] ?? ""
      )
      setPendingSubmission(null)
      if (!result.ok) {
        setErrors((current) => ({
          ...current,
          [submissionId]: result.error,
        }))
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-2 z-10 rounded-lg border bg-background/95 p-3 shadow-sm backdrop-blur">
        <p className="font-semibold">
          Points used: {spent} / {pointBudget}
        </p>
        <p className="text-sm text-muted-foreground">
          {Math.max(0, pointBudget - spent)} points remaining
          {allowDownvotes ? ". Negative votes are allowed." : "."}
        </p>
      </div>
      {submissions.map((submission) => (
        <SubmissionCard key={submission.id} submission={submission}>
          <div className="flex flex-wrap items-end gap-3">
            <label className="space-y-1 text-sm font-medium">
              <span>Points</span>
              <input
                type="number"
                min={allowDownvotes ? -pointBudget : 0}
                max={pointBudget}
                step={1}
                value={points[submission.id] ?? 0}
                onChange={(event) =>
                  setPoints((current) => ({
                    ...current,
                    [submission.id]: Number(event.target.value),
                  }))
                }
                className="h-8 w-24 rounded-lg border border-input bg-background px-2.5"
                aria-label={`Points for ${submission.title || "submission"}`}
              />
            </label>
            <label className="min-w-48 flex-1 space-y-1 text-sm font-medium">
              <span>Comment (optional)</span>
              <input
                type="text"
                maxLength={500}
                value={comments[submission.id] ?? ""}
                onChange={(event) =>
                  setComments((current) => ({
                    ...current,
                    [submission.id]: event.target.value,
                  }))
                }
                className="h-8 w-full rounded-lg border border-input bg-background px-2.5"
                aria-label={`Comment for ${submission.title || "submission"}`}
              />
            </label>
            <Button
              type="button"
              disabled={pending}
              onClick={() => saveVote(submission.id)}
            >
              {pendingSubmission === submission.id ? "Saving..." : "Save vote"}
            </Button>
            {(points[submission.id] !== 0 || comments[submission.id]) && (
              <Button
                type="button"
                variant="ghost"
                disabled={pending}
                onClick={() => {
                  setPoints((current) => ({
                    ...current,
                    [submission.id]: 0,
                  }))
                  setComments((current) => ({
                    ...current,
                    [submission.id]: "",
                  }))
                }}
              >
                Clear
              </Button>
            )}
          </div>
          {errors[submission.id] && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              {errors[submission.id]}
            </p>
          )}
        </SubmissionCard>
      ))}
    </div>
  )
}