"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react"
import { deleteRound, moveRound } from "@/app/(main)/leagues/actions"
import { Button } from "@/components/ui/button"

export function RoundControls({
  roundId,
  isOwner,
  canDelete,
}: {
  roundId: string
  isOwner: boolean
  canDelete: boolean
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function runAction(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (!result.ok) {
        setError(result.error ?? "The action failed. Please try again.")
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {isOwner && (
          <>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Move round up"
              disabled={isPending}
              onClick={() => runAction(() => moveRound(roundId, "up"))}
            >
              <ArrowUp />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Move round down"
              disabled={isPending}
              onClick={() => runAction(() => moveRound(roundId, "down"))}
            >
              <ArrowDown />
            </Button>
          </>
        )}
        {canDelete && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10"
            aria-label="Delete round"
            disabled={isPending}
            onClick={() => {
              if (window.confirm("Are you sure you want to delete this round?")) {
                runAction(() => deleteRound(roundId))
              }
            }}
          >
            <Trash2 />
          </Button>
        )}
      </div>
      {error && (
        <p className="max-w-48 text-right text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
