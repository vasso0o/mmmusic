import { notFound, redirect } from "next/navigation"
import { EditLeagueForm } from "@/components/league/EditLeagueForm"
import { FakeLeagueDashboard } from "@/components/league/FakeLeagueDashboard"
import { JoinLeagueForm } from "@/components/league/JoinLeagueForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default async function LeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/leagues/${leagueId}`)}`)
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId, archivedAt: null },
    include: {
      owner: { select: { name: true } },
    },
  })

  if (!league) {
    notFound()
  }

  const membership = await prisma.leagueMember.findUnique({
    where: {
      leagueId_userId: { leagueId, userId: session.user.id },
    },
    select: { leftAt: true },
  })

  const isOwner = league.ownerId === session.user.id
  const isMember = isOwner || membership?.leftAt === null

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">{league.name}</h1>
        <p className="text-muted-foreground">Hosted by {league.owner.name}</p>
      </header>

      {!isMember ? (
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>League Details</CardTitle>
            <CardDescription>
              Join this league to participate in rounds and vote.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Point Budget</dt>
                <dd className="font-medium">
                  {league.pointBudget} pts per round
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Downvotes</dt>
                <dd className="font-medium">
                  {league.allowDownvotes ? "Allowed" : "Not allowed"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Max Rounds</dt>
                <dd className="font-medium">{league.maxRounds ?? "Endless"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Created</dt>
                <dd className="font-medium">
                  {league.createdAt.toLocaleDateString()}
                </dd>
              </div>
            </dl>
            <div className="border-t pt-4">
              <JoinLeagueForm leagueId={league.id} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <FakeLeagueDashboard />
          {isOwner && <EditLeagueForm league={league} />}
        </>
      )}
    </div>
  )
}