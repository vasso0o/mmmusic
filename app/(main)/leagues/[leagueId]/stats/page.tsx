import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getLeagueStats } from "@/lib/round-stats"
import { processRoundPhases } from "@/lib/rounds"

export default function LeagueStatsPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading league statistics...</p>}>
      <LeagueStatsPageContent params={params} />
    </Suspense>
  )
}

async function LeagueStatsPageContent({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/leagues/${leagueId}/stats`
      )}`
    )
  }

  await processRoundPhases()
  const league = await prisma.league.findFirst({
    where: {
      id: leagueId,
      archivedAt: null,
      members: { some: { userId: session.user.id, leftAt: null } },
    },
    select: { id: true, name: true },
  })
  if (!league) notFound()

  const stats = await getLeagueStats(leagueId)
  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to {league.name}
        </Link>
        <h1 className="mt-3 text-3xl font-bold">{league.name} Statistics</h1>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Member standings</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {stats.length === 0 ? (
            <p className="text-muted-foreground">
              League standings will appear after the first round is revealed.
            </p>
          ) : (
            <table className="w-full min-w-[520px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b p-2">Rank</th>
                  <th className="border-b p-2">Member</th>
                  <th className="border-b p-2">Points</th>
                  <th className="border-b p-2">Round wins</th>
                  <th className="border-b p-2">Rounds played</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((member, index) => (
                  <tr key={member.userId}>
                    <td className="border-b p-2">{index + 1}</td>
                    <th className="border-b p-2 text-left font-medium">
                      {member.name}
                    </th>
                    <td className="border-b p-2">{member.totalPoints}</td>
                    <td className="border-b p-2">{member.wins}</td>
                    <td className="border-b p-2">{member.rounds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </main>
  )
}