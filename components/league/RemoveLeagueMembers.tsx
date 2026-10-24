"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Trash2 } from "lucide-react"
import { removeLeagueMember } from "@/app/(main)/leagues/actions"
import { Button } from "@/components/ui/button"

type RemovableMember = {
  id: string
  name: string
}

export function RemoveLeagueMembers({
  leagueId,
  members,
}: {
  leagueId: string
  members: RemovableMember[]
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [pendingUserId, setPendingUserId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleRemove(member: RemovableMember) {
    if (!window.confirm(`Remove ${member.name} from this league?`)) return

    setError(null)
    setPendingUserId(member.id)
    startTransition(async () => {
      const result = await removeLeagueMember(leagueId, member.id)
      setPendingUserId(null)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="border-t pt-4">
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={isExpanded}
        onClick={() => {
          setIsExpanded((expanded) => !expanded)
          setError(null)
        }}
      >
        {isExpanded ? "Cancel" : "Remove members"}
      </Button>
      {isExpanded && (
        <div className="mt-3 space-y-2">
          {members.length > 0 ? (
            <ul className="space-y-1">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="min-w-0 truncate">{member.name}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10"
                    aria-label={`Remove ${member.name}`}
                    disabled={isPending}
                    onClick={() => handleRemove(member)}
                  >
                    {pendingUserId === member.id ? (
                      <span className="text-xs">...</span>
                    ) : (
                      <Trash2 />
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground">No members to remove.</p>
          )}
          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
