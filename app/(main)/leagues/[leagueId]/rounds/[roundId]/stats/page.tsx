import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processRoundPhases } from "@/lib/rounds"
import { RoundPhase } from "@/lib/generated/prisma/client"

export default function RoundStatsPage({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading statistics...</p>}>
      <RoundStatsPageContent params={params} />
    </Suspense>
  )
}

async function RoundStatsPageContent({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  const { leagueId, roundId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/leagues/${leagueId}/rounds/${roundId}/stats`
      )}`
    )
  }

  await processRoundPhases()
  const round = await prisma.round.findFirst({
    where: {
      id: roundId,
      leagueId,
      league: {
        archivedAt: null,
        members: {
          some: { userId: session.user.id, leftAt: null },
        },
      },
    },
    include: {
      submissions: {
        where: { disqualified: false },
        include: {
          user: { select: { id: true, name: true } },
          votes: {
            include: { voter: { select: { id: true, name: true } } },
          },
        },
      },
    },
  })
  if (!round) notFound()
  if (round.phase !== RoundPhase.REVEALED) {
    redirect(`/leagues/${leagueId}/rounds/${roundId}`)
  }

  const voterById = new Map<string, string>()
  for (const submission of round.submissions) {
    for (const vote of submission.votes) {
      voterById.set(vote.voter.id, vote.voter.name)
    }
  }

  const rankedSubmissions = round.submissions
    .map((submission) => ({
      id: submission.id,
      title:
        [submission.title, submission.artist].filter(Boolean).join(" — ") ||
        "Untitled song",
      user: submission.user.name,
      points: submission.votes.reduce((sum, vote) => sum + vote.points, 0),
      votes: submission.votes,
    }))
    .sort((first, second) => second.points - first.points)
  const voters = [...voterById.entries()].sort((first, second) =>
    first[1].localeCompare(second[1])
  )

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/leagues/${leagueId}/rounds/${roundId}/results`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to results
        </Link>
        <h1 className="mt-3 text-3xl font-bold">
          Statistics: Round {round.roundNumber} — {round.theme}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Submission scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rankedSubmissions.length === 0 ? (
            <p className="text-muted-foreground">No eligible submissions.</p>
          ) : (
            rankedSubmissions.map((submission, index) => (
              <div
                key={submission.id}
                className="flex items-center justify-between gap-4 border-b pb-2 last:border-0"
              >
                <p>
                  <span className="mr-2 text-muted-foreground">
                    {index + 1}.
                  </span>
                  <span className="font-medium">{submission.title}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    by {submission.user}
                  </span>
                </p>
                <span className="shrink-0 font-semibold">
                  {submission.points} pts
                </span>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vote matrix</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {voters.length === 0 || rankedSubmissions.length === 0 ? (
            <p className="text-muted-foreground">No votes to display.</p>
          ) : (
            <table className="w-full min-w-[600px] border-collapse text-left text-sm">
              <thead>
                <tr>
                  <th className="border-b p-2">Voter</th>
                  {rankedSubmissions.map((submission) => (
                    <th key={submission.id} className="border-b p-2">
                      {submission.title}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {voters.map(([voterId, voterName]) => (
                  <tr key={voterId}>
                    <th className="border-b p-2 font-medium">{voterName}</th>
                    {rankedSubmissions.map((submission) => {
                      const vote = submission.votes.find(
                        (item) => item.voterId === voterId
                      )
                      return (
                        <td key={submission.id} className="border-b p-2">
                          {vote
                            ? `${vote.points > 0 ? "+" : ""}${vote.points}`
                            : "—"}
                        </td>
                      )
                    })}
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