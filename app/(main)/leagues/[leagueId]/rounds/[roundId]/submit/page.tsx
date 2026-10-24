import { Suspense } from "react"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { SubmitSongForm } from "@/components/round/SubmitSongForm"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processRoundPhases } from "@/lib/rounds"
import { RoundPhase } from "@/lib/generated/prisma/client"

export default function SubmitSongPage({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading submission form...</p>}>
      <SubmitSongPageContent params={params} />
    </Suspense>
  )
}

async function SubmitSongPageContent({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  const { leagueId, roundId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/leagues/${leagueId}/rounds/${roundId}/submit`
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
        where: { userId: session.user.id },
        select: {
          url: true,
          platform: true,
          title: true,
          artist: true,
          pitch: true,
        },
      },
    },
  })
  if (!round) notFound()
  if (
    round.phase !== RoundPhase.SUBMISSION ||
    round.submitDeadline <= new Date()
  ) {
    redirect(`/leagues/${leagueId}/rounds/${roundId}`)
  }

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <div>
        <Link
          href={`/leagues/${leagueId}`}
          className="text-sm text-muted-foreground hover:underline"
        >
          Back to league
        </Link>
        <h1 className="mt-3 text-3xl font-bold">
          Submit for Round {round.roundNumber}: {round.theme}
        </h1>
        {round.themeDesc && (
          <p className="mt-2 whitespace-pre-wrap text-muted-foreground">
            {round.themeDesc}
          </p>
        )}
        <p className="mt-2 text-sm text-muted-foreground">
          Submissions close{" "}
          {round.submitDeadline.toLocaleString(undefined, {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
      <SubmitSongForm
        leagueId={leagueId}
        roundId={roundId}
        existingSubmission={round.submissions[0] ?? null}
      />
    </main>
  )
}