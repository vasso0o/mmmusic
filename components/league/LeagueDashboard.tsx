import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { RoundControls } from "@/components/round/RoundControls"
import { Button } from "@/components/ui/button"

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
  phase: string
  startsAt: Date
  submitDeadline: Date
  voteDeadline: Date
  createdById: string
}

export function LeagueDashboard({
  league,
  rounds,
  currentUserId,
}: {
  league: DashboardLeague
  rounds: DashboardRound[]
  currentUserId: string
}) {
  const isOwner = league.ownerId === currentUserId

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
              const canDelete =
                isOwner || round.createdById === currentUserId

              return (
                <Card key={round.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle>
                        <Link
                          href={`/leagues/${league.id}/rounds/${round.id}`}
                          className="hover:underline"
                        >
                          Round {round.roundNumber}: {round.theme}
                        </Link>
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {round.themeDesc || "No description."}
                      </CardDescription>
                    </div>
                    <RoundControls
                      roundId={round.id}
                      isOwner={isOwner}
                      canDelete={canDelete}
                    />
                  </CardHeader>
                  <CardContent>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <p>
                        Phase:{" "}
                        <span className="font-semibold text-foreground">
                          {round.phase}
                        </span>
                      </p>
                      <p>
                        Starts:{" "}
                        {round.startsAt.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p>
                        Submit by:{" "}
                        {round.submitDeadline.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                      <p>
                        Voting ends:{" "}
                        {round.voteDeadline.toLocaleString(undefined, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                  </CardContent>
                </Card>
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
