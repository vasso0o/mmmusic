"use client"

import { useState, useTransition } from "react"
import { Settings } from "lucide-react"
import { updateLeague } from "@/app/(main)/leagues/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type EditableLeague = {
  id: string
  name: string
  pointBudget: number
  allowDownvotes: boolean
  maxRounds: number | null
}

export function EditLeagueForm({ league }: { league: EditableLeague }) {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await updateLeague(league.id, formData)
      if (!result.ok) {
        setError(result.error)
        return
      }

      setIsOpen(false)
    })
  }

  return (
    <section className="mt-8 rounded-lg border bg-muted/20 p-4">
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open)
          setError(null)
        }}
        className="flex items-center gap-2 text-lg font-semibold transition-colors hover:text-primary"
        aria-expanded={isOpen}
      >
        <Settings className="size-5" />
        Edit League Settings
      </button>

      {isOpen && (
        <form action={onSubmit} className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="edit-league-name" className="text-sm font-medium">
                League Name
              </label>
              <Input
                id="edit-league-name"
                name="name"
                defaultValue={league.name}
                minLength={3}
                maxLength={50}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-league-password"
                className="text-sm font-medium"
              >
                New Password (leave blank to keep current)
              </label>
              <Input
                id="edit-league-password"
                name="password"
                type="password"
                autoComplete="new-password"
                minLength={4}
                maxLength={72}
                placeholder="Leave blank to keep current"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label
                htmlFor="edit-league-point-budget"
                className="text-sm font-medium"
              >
                Point Budget
              </label>
              <Input
                id="edit-league-point-budget"
                name="pointBudget"
                type="number"
                defaultValue={league.pointBudget}
                min={1}
                step={1}
                required
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="edit-league-max-rounds"
                className="text-sm font-medium"
              >
                Max Rounds (Optional)
              </label>
              <Input
                id="edit-league-max-rounds"
                name="maxRounds"
                type="number"
                defaultValue={league.maxRounds ?? ""}
                min={1}
                step={1}
              />
            </div>
            <label className="flex items-center justify-between rounded-md border p-2">
              <span className="text-sm font-medium">Allow Downvotes</span>
              <input
                name="allowDownvotes"
                type="checkbox"
                defaultChecked={league.allowDownvotes}
                className="size-4 accent-primary"
              />
            </label>
          </div>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      )}
    </section>
  )
}
