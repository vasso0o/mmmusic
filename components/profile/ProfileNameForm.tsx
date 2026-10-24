"use client"

import { useState, useTransition, type FormEvent } from "react"
import { updateUserName } from "@/app/(main)/profile/actions"
import { Button } from "@/components/ui/button"

export function ProfileNameForm({ name }: { name: string }) {
  const [value, setValue] = useState(name)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await updateUserName(value)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setValue(value.trim())
      setSaved(true)
    })
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <label className="block space-y-1.5 text-sm font-medium">
        Display name
        <input
          type="text"
          name="name"
          autoComplete="name"
          maxLength={80}
          required
          value={value}
          onChange={(event) => {
            setValue(event.target.value)
            setSaved(false)
          }}
          className="h-9 w-full rounded-lg border border-input bg-background px-3"
        />
      </label>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving..." : "Save name"}
      </Button>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-muted-foreground" role="status">
          Name updated.
        </p>
      )}
    </form>
  )
}
