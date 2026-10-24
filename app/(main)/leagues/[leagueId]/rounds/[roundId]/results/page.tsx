import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ResultsReveal } from "@/components/round/ResultsReveal"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processRoundPhases } from "@/lib/rounds"
import { RoundPhase } from "@/lib/generated/prisma/client"

export default function ResultsPage({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading results...</p>}>
      <ResultsPageContent params={params} />
    </Suspense>
  )
}

async function ResultsPageContent({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  const { leagueId, roundId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/leagues/${leagueId}/rounds/${roundId}/results`
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
          user: { select: { name: true } },
          votes: {
            include: { voter: { select: { name: true } } },
          },
        },
      },
    },
  })
  if (!round) notFound()
  if (round.phase !== RoundPhase.REVEALED) {
    redirect(`/leagues/${leagueId}/rounds/${roundId}`)
  }

  const submissions = round.submissions
    .map((submission) => ({
      ...submission,
      totalPoints: submission.votes.reduce(
        (total, vote) => total + vote.points,
        0
      ),
      votes: [...submission.votes].sort(
        (first, second) => second.points - first.points
      ),
    }))
    .sort((first, second) => second.totalPoints - first.totalPoints)

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to league
        </Link>
        <h1 className="mt-3 text-3xl font-bold">
          Results: Round {round.roundNumber} — {round.theme}
        </h1>
        {round.themeDesc && (
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {round.themeDesc}
          </p>
        )}
        <Link
          href={`/leagues/${leagueId}/rounds/${roundId}/stats`}
          className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
        >
          View round statistics
        </Link>
      </div>
      <ResultsReveal submissions={submissions} />
    </main>
  )
}
