"use client"

import { useState, useTransition } from "react"
import { deleteUserAccount } from "@/app/(main)/profile/actions"
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

export function DeleteAccountButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function confirmDelete() {
    setError(null)
    startTransition(async () => {
      const result = await deleteUserAccount()
      if (!result.ok) {
        setError(result.error)
        return
      }
      setIsOpen(false)
    })
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!pending) {
          setIsOpen(open)
          if (!open) setError(null)
        }
      }}
    >
      <DialogTrigger
        render={
          <Button type="button" variant="destructive" size="sm">
            Delete account
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete your account?</DialogTitle>
          <DialogDescription>
            Your account will be deactivated and you will be signed out.
            Historical submissions and votes will be kept. Leagues you own
            will be archived, and you will be removed from other active leagues.
            This cannot be undone.
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
            disabled={pending}
            onClick={() => setIsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={confirmDelete}
          >
            {pending ? "Deleting..." : "Yes, delete my account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
