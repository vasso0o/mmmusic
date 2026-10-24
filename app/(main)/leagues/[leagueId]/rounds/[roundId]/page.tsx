import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processRoundPhases } from "@/lib/rounds"
import { RoundPhase } from "@/lib/generated/prisma/client"

export default function RoundPage({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}) {
  return (
    <Suspense fallback={<p className="p-8 text-muted-foreground">Loading round...</p>}>
      <RoundPageContent params={params} />
    </Suspense>
  )
}

async function RoundPageContent({
  params,
}: {
  params: Promise<{ leagueId: string; roundId: string }>
}): Promise<never> {
  const { leagueId, roundId } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/leagues/${leagueId}/rounds/${roundId}`
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
    select: { phase: true },
  })
  if (!round) return notFound()

  const base = `/leagues/${leagueId}/rounds/${roundId}`
  if (round.phase === RoundPhase.SUBMISSION) return redirect(`${base}/submit`)
  if (round.phase === RoundPhase.VOTING) return redirect(`${base}/vote`)
  return redirect(`${base}/results`)
}