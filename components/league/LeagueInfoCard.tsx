import Image from "next/image"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RemoveLeagueMembers } from "@/components/league/RemoveLeagueMembers"

type LeagueInfoMember = {
  id: string
  name: string
  image: string | null
}

type LeagueInfoLeague = {
  id: string
  ownerId: string
  pointBudget: number
  allowDownvotes: boolean
  owner: { name: string }
}

export function LeagueInfoCard({
  league,
  members,
  isOwner,
}: {
  league: LeagueInfoLeague
  members: LeagueInfoMember[]
  isOwner: boolean
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>League Info</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <Link
          href={`/leagues/${league.id}/stats`}
          className="inline-block font-medium text-primary hover:underline"
        >
          League statistics
        </Link>
        <p>
          <span className="text-muted-foreground">Owner:</span>{" "}
          {league.owner.name}
        </p>
        <p>
          <span className="text-muted-foreground">Point Budget:</span>{" "}
          {league.pointBudget}
        </p>
        <p>
          <span className="text-muted-foreground">Downvotes:</span>{" "}
          {league.allowDownvotes ? "Yes" : "No"}
        </p>
        <section className="border-t pt-4" aria-label="League members">
          <h3 className="font-semibold">
            Members{" "}
            <span className="text-muted-foreground">({members.length})</span>
          </h3>
          {members.length > 0 ? (
            <ul className="mt-3 grid grid-cols-3 gap-3">
              {members.map((member) => (
                <li
                  key={member.id}
                  className="flex min-w-0 flex-col items-center gap-1.5 text-center"
                >
                  <span className="relative flex size-12 items-center justify-center overflow-hidden rounded-full bg-secondary font-semibold text-secondary-foreground">
                    {member.image ? (
                      <Image
                        src={member.image}
                        alt=""
                        fill
                        sizes="48px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      member.name.trim().charAt(0).toUpperCase() || "?"
                    )}
                  </span>
                  <span className="max-w-full truncate text-xs">
                    {member.name}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-muted-foreground">No members yet.</p>
          )}
        </section>
        {isOwner && (
          <RemoveLeagueMembers
            leagueId={league.id}
            members={members
              .filter((member) => member.id !== league.ownerId)
              .map(({ id, name }) => ({ id, name }))}
          />
        )}
      </CardContent>
    </Card>
  )
}
