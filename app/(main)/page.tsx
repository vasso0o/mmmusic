import { Suspense } from "react"
import { redirect } from "next/navigation"
import { CreateLeagueForm } from "@/components/league/CreateLeagueForm"
import { LeagueCard } from "@/components/league/LeagueCard"
import { LeagueSearch } from "@/components/league/LeagueSearch"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default function MainPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8">
          <div className="h-8 w-full max-w-2xl animate-pulse rounded-lg bg-muted" />
          <section className="w-full space-y-4">
            <div className="h-7 w-40 animate-pulse rounded bg-muted" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-28 animate-pulse rounded-xl bg-muted"
                />
              ))}
            </div>
          </section>
        </div>
      }
    >
      <MainPageContent />
    </Suspense>
  )
}

async function MainPageContent() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const [joinedLeagues, ownedLeagues] = await Promise.all([
    prisma.leagueMember.findMany({
      where: {
        userId: session.user.id,
        leftAt: null,
      },
      include: {
        league: {
          include: {
            _count: {
              select: { members: { where: { leftAt: null } } },
            },
          },
        },
      },
      orderBy: { joinedAt: "desc" },
      take: 6,
    }),
    prisma.league.findMany({
      where: {
        ownerId: session.user.id,
        archivedAt: null,
      },
      include: {
        _count: {
          select: { members: { where: { leftAt: null } } },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ])

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center px-4 py-8">
      <LeagueSearch />

      <section className="relative mt-[6rem] w-full">
        <h2 className="absolute top-[-40px] z-[1] text-4xl leading-none font-bold opacity-50 sm:text-[4rem]">
          Joined Leagues
        </h2>
        {joinedLeagues.length === 0 ? (
          <p className="text-muted-foreground">
            You haven&apos;t joined any leagues yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {joinedLeagues.map((membership) => (
              <LeagueCard
                key={membership.leagueId}
                id={membership.league.id}
                title={membership.league.name}
                image={membership.league.image}
                memberCount={membership.league._count.members}
              />
            ))}
          </div>
        )}
      </section>

      <CreateLeagueForm />

      <section className="relative mt-[6rem] w-full">
        <h2 className="absolute top-[-40px] z-[1] text-4xl leading-none font-bold opacity-50 sm:text-[4rem]">
          Your Created Leagues
        </h2>
        {ownedLeagues.length === 0 ? (
          <p className="text-muted-foreground">
            You haven&apos;t created any leagues yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
            {ownedLeagues.map((league) => (
              <LeagueCard
                key={league.id}
                id={league.id}
                title={league.name}
                image={league.image}
                memberCount={league._count.members}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
