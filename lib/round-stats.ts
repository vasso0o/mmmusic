import { RoundPhase } from "@/lib/generated/prisma/client"
import { prisma } from "@/lib/prisma"

export async function getLeagueStats(leagueId: string) {
  const rounds = await prisma.round.findMany({
    where: { leagueId, phase: RoundPhase.REVEALED },
    orderBy: { roundNumber: "asc" },
    select: {
      submissions: {
        where: { disqualified: false },
        select: {
          userId: true,
          user: { select: { name: true } },
          votes: { select: { points: true } },
        },
      },
    },
  })

  const stats = new Map<
    string,
    { userId: string; name: string; totalPoints: number; wins: number; rounds: number }
  >()

  for (const round of rounds) {
    const scores = round.submissions.map((submission) => ({
      userId: submission.userId,
      name: submission.user.name,
      points: submission.votes.reduce((sum, vote) => sum + vote.points, 0),
    }))
    const highestScore = Math.max(...scores.map((score) => score.points))

    for (const score of scores) {
      const userStats = stats.get(score.userId) ?? {
        userId: score.userId,
        name: score.name,
        totalPoints: 0,
        wins: 0,
        rounds: 0,
      }
      userStats.totalPoints += score.points
      userStats.rounds += 1
      if (score.points === highestScore) userStats.wins += 1
      stats.set(score.userId, userStats)
    }
  }

  return [...stats.values()].sort(
    (first, second) =>
      second.totalPoints - first.totalPoints ||
      second.wins - first.wins ||
      first.name.localeCompare(second.name)
  )
}
