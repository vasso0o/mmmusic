import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoundCard } from "@/components/round/RoundCard"
import { Button } from "@/components/ui/button"
import type { RoundPhase, RoundPlatform } from "@/lib/round-types"

type DashboardMember = {
  id: string
  name: string
  image: string | null
}

type DashboardLeague = {
  id: string
  ownerId: string
  pointBudget: number
  allowDownvotes: boolean
  owner: { name: string }
}

type DashboardRound = {
  id: string
  roundNumber: number
  theme: string
  themeDesc: string | null
  phase: RoundPhase
  startsAt: Date
  submitDeadline: Date
  voteDeadline: Date
  createdById: string
  submissions: {
    userId: string
    url: string
    platform: RoundPlatform
    title: string | null
    artist: string | null
    pitch: string | null
  }[]
  votes: { voterId: string }[]
}

export function LeagueDashboard({
  league,
  rounds,
  currentUserId,
  members,
}: {
  league: DashboardLeague
  rounds: DashboardRound[]
  currentUserId: string
  members: DashboardMember[]
}) {
  const isOwner = league.ownerId === currentUserId
  const currentRoundId = rounds.find((round) => round.phase !== "REVEALED")?.id

  return (
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-bold">Rounds</h2>
          <Button
            nativeButton={false}
            render={<Link href={`/leagues/${league.id}/rounds/new`} />}
          >
            + Create New Round
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {rounds.length === 0 ? (
            <p className="text-muted-foreground">
              No rounds have been created yet.
            </p>
          ) : (
            rounds.map((round) => {
              const isCurrentRound = round.id === currentRoundId

              return (
                <RoundCard
                  key={round.id}
                  leagueId={league.id}
                  round={round}
                  currentUserId={currentUserId}
                  isOwner={isOwner}
                  isCurrentRound={isCurrentRound}
                  members={members}
                />
              )
            })
          )}
        </div>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>League Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
