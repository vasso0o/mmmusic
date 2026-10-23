import { Suspense } from "react"
import { notFound, redirect } from "next/navigation"
import { CreateRoundForm } from "@/components/round/CreateRoundForm"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default function NewRoundPage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl px-4 py-8" aria-busy="true">
          <h1 className="mb-6 text-2xl font-bold">Create New Round</h1>
          <p className="text-muted-foreground">Loading round form...</p>
        </div>
      }
    >
      <NewRoundPageContent params={params} />
    </Suspense>
  )
}

async function NewRoundPageContent({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(
      `/login?callbackUrl=${encodeURIComponent(
        `/leagues/${leagueId}/rounds/new`
      )}`
    )
  }

  const league = await prisma.league.findFirst({
    where: { id: leagueId, archivedAt: null },
    select: { id: true },
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
  if (!membership || membership.leftAt) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Create New Round</h1>
      <CreateRoundForm leagueId={leagueId} />
    </div>
  )
}