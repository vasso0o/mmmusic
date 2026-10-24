import { prisma } from "@/lib/prisma"
import { RoundPhase } from "@/lib/generated/prisma/client"

export async function processRoundPhases() {
  const now = new Date()

  const submissionTransitions = await prisma.round.updateMany({
    where: {
      phase: RoundPhase.SUBMISSION,
      submitDeadline: { lte: now },
    },
    data: { phase: RoundPhase.VOTING },
  })

  const revealTransitions = await prisma.round.updateMany({
    where: {
      phase: RoundPhase.VOTING,
      voteDeadline: { lte: now },
    },
    data: { phase: RoundPhase.REVEALED, revealedAt: now },
  })

  return {
    submissionTransitions: submissionTransitions.count,
    revealTransitions: revealTransitions.count,
  }
}
