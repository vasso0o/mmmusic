"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { leaveLeague } from "@/app/(main)/leagues/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function LeaveLeagueButton({ leagueId }: { leagueId: string }) {
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function confirmLeave() {
    setError(null)
    startTransition(async () => {
      const result = await leaveLeague(leagueId)
      if (!result.ok) {
        setError(result.error)
        return
      }

      setIsOpen(false)
      router.refresh()
    })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!isPending) {
          setIsOpen(open)
          if (!open) setError(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="destructive"
            size="sm"
            disabled={isPending}
          />
        }
      >
        <LogOut />
        Leave League
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Leave this league?</DialogTitle>
          <DialogDescription>
            You will lose access to its rounds, submissions, and voting until
            you join again.
          </DialogDescription>
        </DialogHeader>
        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isPending}
            onClick={confirmLeave}
          >
            {isPending ? "Leaving..." : "Yes, leave league"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
