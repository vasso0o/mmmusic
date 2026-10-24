import { Suspense } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ComingSoon } from "@/components/layout/coming-soon"
import { EditLeagueForm } from "@/components/league/EditLeagueForm"
import { LeagueDashboard } from "@/components/league/LeagueDashboard"
import { JoinLeagueForm } from "@/components/league/JoinLeagueForm"
import { LeaveLeagueButton } from "@/components/league/LeaveLeagueButton"
import { PublicLeagueView } from "@/components/league/PublicLeagueView"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { processRoundPhases } from "@/lib/rounds"

export default function LeaguePage({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  return (
    <Suspense fallback={<ComingSoon title="Loading league" />}>
      <LeaguePageContent params={params} />
    </Suspense>
  )
}

async function LeaguePageContent({
  params,
}: {
  params: Promise<{ leagueId: string }>
}) {
  const { leagueId } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/leagues/${leagueId}`)}`)
  }

  await processRoundPhases()

  const league = await prisma.league.findFirst({
    where: { id: leagueId, archivedAt: null },
    include: {
      owner: { select: { name: true } },
    },
  })

  if (!league) {
    notFound()
  }

  const [membership, memberCount, currentUser, activeMembers] = await Promise.all([
    prisma.leagueMember.findUnique({
      where: {
        leagueId_userId: { leagueId, userId: session.user.id },
      },
      select: { leftAt: true },
    }),
    prisma.leagueMember.count({
      where: { leagueId, leftAt: null },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, image: true },
    }),
    prisma.leagueMember.findMany({
      where: { leagueId, leftAt: null },
      select: {
        user: { select: { id: true, name: true, image: true } },
      },
    }),
  ])
  const members = activeMembers.map(({ user }) => user)
  const isOwner = league.ownerId === session.user.id
  const isMember = isOwner || membership?.leftAt === null
  const rounds = isMember
    ? await prisma.round.findMany({
        where: { leagueId },
        orderBy: { roundNumber: "asc" },
        include: {
          votes: { select: { voterId: true } },
          submissions: {
            select: {
              userId: true,
              url: true,
              platform: true,
              title: true,
              artist: true,
              pitch: true,
            },
          },
        },
      })
    : []

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8">
      {!isMember ? (
        <div className="space-y-6">
          <PublicLeagueView league={league} memberCount={memberCount} />
          <div className="max-w-2xl border-t pt-6">
            <h2 className="mb-2 text-lg font-semibold">Want to join?</h2>
            <JoinLeagueForm leagueId={league.id} />
          </div>
        </div>
      ) : (
        <>
          <header className="mb-8 flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{league.name}</h1>
              <p className="text-muted-foreground">
                Hosted by {league.owner.name}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isOwner && <LeaveLeagueButton leagueId={league.id} />}
              {currentUser && (
                <Link
                  href="/profile"
                  className="flex items-center gap-2 rounded-full border bg-muted/50 py-1.5 pr-3 pl-1.5 transition-colors hover:bg-muted"
                >
                  <span className="relative flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                    {currentUser.image ? (
                      <Image
                        src={currentUser.image}
                        alt=""
                        fill
                        sizes="32px"
                        unoptimized
                        className="object-cover"
                      />
                    ) : (
                      currentUser.name.charAt(0).toUpperCase() || "U"
                    )}
                  </span>
                  <span className="text-sm font-medium">
                    {currentUser.name}
                  </span>
                </Link>
              )}
            </div>
          </header>
          <LeagueDashboard
            league={league}
            rounds={rounds}
            currentUserId={session.user.id}
            members={members}
          />
          {isOwner && <EditLeagueForm league={league} />}
        </>
      )}
    </div>
  )
}