import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { PointAllocator } from "@/components/round/PointAllocator"
import { SubmissionCard } from "@/components/round/SubmissionCard"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processRoundPhases } from "@/lib/rounds"
import { RoundPhase } from "@/lib/generated/prisma/client"

export default function VotePage({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading ballot...</p>}>
      <VotePageContent params={params} />
    </Suspense>
  )
}

async function VotePageContent({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  const { leagueId, roundId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/leagues/${leagueId}/rounds/${roundId}/vote`
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
      league: {
        select: { pointBudget: true, allowDownvotes: true },
      },
      submissions: {
        where: { disqualified: false },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          url: true,
          platform: true,
          title: true,
          artist: true,
          pitch: true,
          userId: true,
          user: { select: { name: true } },
          votes: {
            where: { voterId: session.user.id },
            select: { points: true, comment: true },
          },
        },
      },
    },
  })
  if (!round) notFound()
  if (
    round.phase !== RoundPhase.VOTING ||
    round.voteDeadline <= new Date()
  ) {
    redirect(`/leagues/${leagueId}/rounds/${roundId}`)
  }

  const ownSubmission = round.submissions.find(
    (submission) => submission.userId === session.user.id
  )
  const votableSubmissions = round.submissions
    .filter((submission) => submission.userId !== session.user.id)
    .map((submission) => ({
      id: submission.id,
      url: submission.url,
      platform: submission.platform,
      title: submission.title,
      artist: submission.artist,
      pitch: submission.pitch,
      initialPoints: submission.votes[0]?.points ?? 0,
      initialComment: submission.votes[0]?.comment ?? "",
    }))
  const pointsUsed = votableSubmissions.reduce(
    (total, submission) => total + Math.abs(submission.initialPoints),
    0
  )

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
          Vote: Round {round.roundNumber} — {round.theme}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Voting closes{" "}
          {round.voteDeadline.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
      {ownSubmission && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your submission</h2>
          <SubmissionCard
            submission={{
              id: ownSubmission.id,
              url: ownSubmission.url,
              platform: ownSubmission.platform,
              title: ownSubmission.title,
              artist: ownSubmission.artist,
              pitch: ownSubmission.pitch,
            }}
          />
        </section>
      )}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ballot</h2>
        {votableSubmissions.length === 0 ? (
          <p className="text-muted-foreground">
            There are no other eligible submissions to vote on.
          </p>
        ) : (
          <PointAllocator
            leagueId={leagueId}
            roundId={roundId}
            submissions={votableSubmissions}
            pointBudget={round.league.pointBudget}
            allowDownvotes={round.league.allowDownvotes}
          />
        )}
        {pointsUsed > round.league.pointBudget && (
          <p className="text-sm text-destructive" role="alert">
            Your current votes exceed the league budget. Update them before
            casting more votes.
          </p>
        )}
      </section>
    </main>
  )
}