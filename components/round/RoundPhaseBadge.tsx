import { Badge } from "@/components/ui/badge"
import type { RoundPhase } from "@/lib/round-types"

const phaseStyles: Record<RoundPhase, string> = {
  SUBMISSION:
    "border-blue-300 bg-blue-100 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  VOTING:
    "border-amber-300 bg-amber-100 text-amber-900 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  REVEALED:
    "border-emerald-300 bg-emerald-100 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
}


const phaseLabels: Record<RoundPhase, string> = {
  SUBMISSION: "Submission",
  VOTING: "Voting",
  REVEALED: "Revealed",
}

export function RoundPhaseBadge({ phase }: { phase: RoundPhase }) {
  return (
    <Badge
      variant="outline"
      className={`h-auto px-3 py-1.5 text-sm font-bold ${phaseStyles[phase]}`}
    >
      {phaseLabels[phase]}
    </Badge>
  )
}