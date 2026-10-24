import Link from "next/link"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RoundControls } from "@/components/round/RoundControls"
import { RoundPhaseBadge } from "@/components/round/RoundPhaseBadge"
import { SubmitSongForm } from "@/components/round/SubmitSongForm"
import { MemberStatusAvatars } from "@/components/round/MemberStatusAvatars"
import type { RoundPhase, RoundPlatform } from "@/lib/round-types"

type ExistingSubmission = {
  userId: string
  url: string
  platform: RoundPlatform
  title: string | null
  artist: string | null
  pitch: string | null
}

type RoundCardRound = {
  id: string
  roundNumber: number
  theme: string
  themeDesc: string | null
  phase: RoundPhase
  startsAt: Date
  submitDeadline: Date
  voteDeadline: Date
  createdById: string
  submissions: ExistingSubmission[]
  votes: { voterId: string }[]
}

export function RoundCard({
  leagueId,
  round,
  currentUserId,
  isOwner,
  isCurrentRound,
  members,
}: {
  leagueId: string
  round: RoundCardRound
  currentUserId: string
  isOwner: boolean
  isCurrentRound: boolean
  members: { id: string; name: string; image: string | null }[]
}) {
  const canDelete = isOwner || round.createdById === currentUserId
  const isSubmissionPhase = isCurrentRound && round.phase === "SUBMISSION"
  const isVotingPhase = isCurrentRound && round.phase === "VOTING"
  const canSubmit = isSubmissionPhase && round.submitDeadline > new Date()

  return (
    <Card
      className={
        isCurrentRound
          ? "border-purple-300 bg-purple-100/80 dark:border-purple-800 dark:bg-purple-950/50"
          : undefined
      }
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle>
              <Link
                href={`/leagues/${leagueId}/rounds/${round.id}`}
                className="hover:underline"
              >
                Round {round.roundNumber}: {round.theme}
              </Link>
            </CardTitle>
            {isCurrentRound && (
              <Badge className="bg-purple-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-purple-700 dark:bg-purple-300 dark:text-purple-950 dark:hover:bg-purple-300">
                Current round
              </Badge>
            )}
          </div>
          <CardDescription className="mt-1">
            {round.themeDesc || "No description."}
          </CardDescription>
        </div>
        <RoundControls
          roundId={round.id}
          isOwner={isOwner}
          canDelete={canDelete}
        />
      </CardHeader>
      <CardContent>
        <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Phase:</span>
            <RoundPhaseBadge phase={round.phase} />
          </div>
          <p>
            Starts:{" "}
            {round.startsAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p>
            Submit by:{" "}
            {round.submitDeadline.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
          <p>
            Voting ends:{" "}
            {round.voteDeadline.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </div>
        {isSubmissionPhase && (
          <section className="mt-6 space-y-3 border-t border-purple-300/70 pt-5 dark:border-purple-800">
            <div>
              {canSubmit ? (
                <>
                  <h3 className="text-lg font-semibold">Submit your song</h3>
                  <p className="text-sm text-muted-foreground">
                    Find a track that fits this round&apos;s theme.
                  </p>
                </>
              ) : (
                <p className="text-sm font-medium text-muted-foreground">
                  The submission deadline has passed.
                </p>
              )}
            </div>
            {canSubmit && (
              <SubmitSongForm
                leagueId={leagueId}
                roundId={round.id}
                existingSubmission={
                  round.submissions.find(
                    (submission) => submission.userId === currentUserId
                  ) ?? null
                }
              />
            )}
            <MemberStatusAvatars
              members={members}
              completedUserIds={round.submissions.map(
                (submission) => submission.userId
              )}
              completedLabel="Submitted"
              pendingLabel="Pending"
            />
          </section>
        )}
        {isVotingPhase && (
          <section className="mt-6 space-y-3 border-t border-purple-300/70 pt-5 dark:border-purple-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-lg font-semibold">Voting progress</h3>
              <Link
                href={`/leagues/${leagueId}/rounds/${round.id}/vote`}
                className="text-sm font-medium text-primary hover:underline"
              >
                Go to ballot
              </Link>
            </div>
            <MemberStatusAvatars
              members={members}
              completedUserIds={round.votes.map((vote) => vote.voterId)}
              completedLabel="Voted"
              pendingLabel="Not voted"
            />
          </section>
        )}
      </CardContent>
    </Card>
  )
}
