// components/logout-button.tsx
"use client"

import { useTransition } from "react"
import { logoutUser } from "@/app/(auth)/logout/actions"
import { Button } from "@/components/ui/button"

export function LogoutButton() {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => startTransition(() => logoutUser())}
    >
      {pending ? "Signing out…" : "Logout"}
    </Button>
  )
}