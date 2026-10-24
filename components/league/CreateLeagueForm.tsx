"use client"

import { useRef, useState, useTransition } from "react"
import { Plus } from "lucide-react"
import { createLeague } from "@/app/(main)/leagues/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  LeagueImageInput,
  type LeagueImageInputHandle,
} from "@/components/league/LeagueImageInput"

export function CreateLeagueForm() {
  const [isOpen, setIsOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const formRef = useRef<HTMLFormElement>(null)
  const imageInputRef = useRef<LeagueImageInputHandle>(null)

  function onSubmit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const image = await imageInputRef.current?.getCroppedImage()
      if (image === null) return
      if (image) formData.set("image", image)

      const result = await createLeague(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }

      formRef.current?.reset()
      setIsOpen(false)
    })
  }

  return (
    <section
      className={`mt-6 max-w-5xl p-4 ${isOpen ? "" : "flex"}`}
    >
      <div className="w-full text-[10rem]">/</div>
      <button
        type="button"
        onClick={() => {
          setIsOpen((open) => !open)
          setError(null)
        }}
        className="flex items-center gap-2 mt-2 text-lg font-semibold transition-colors hover:text-primary text-nowrap"
        aria-expanded={isOpen}
      >
        Create New League
        <Plus
          className={`size-5 transition-transform ${isOpen ? "rotate-45" : ""}`}
        />
      </button>

      {isOpen && (
        <form
          ref={formRef}
          action={onSubmit}
          className="mt-4 space-y-4"
        >
          <div className="space-y-2">
            <label htmlFor="league-name" className="text-sm font-medium">
              League Name
            </label>
            <Input
              id="league-name"
              name="name"
              required
              minLength={3}
              maxLength={50}
              placeholder="e.g. Indie Heads"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="league-password" className="text-sm font-medium">
              Join Password
            </label>
            <Input
              id="league-password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={4}
              maxLength={72}
              placeholder="Required for others to join"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="league-description"
              className="text-sm font-medium"
            >
              Description (Optional)
            </label>
            <textarea
              id="league-description"
              name="description"
              maxLength={2000}
              rows={4}
              placeholder="Tell people what your league is about..."
              className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </div>

          <LeagueImageInput ref={imageInputRef} />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label htmlFor="league-point-budget" className="text-sm font-medium">
                Point Budget
              </label>
              <Input
                id="league-point-budget"
                name="pointBudget"
                type="number"
                defaultValue={10}
                min={1}
                step={1}
                required
              />
            </div>
            <label className="flex items-center justify-between rounded-md border p-2">
              <span className="text-sm font-medium">Allow Downvotes</span>
              <input
                name="allowDownvotes"
                type="checkbox"
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
            {isPending ? "Creating..." : "Create League"}
          </Button>
        </form>
      )}
    </section>
  )
}