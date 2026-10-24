import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SongEmbed } from "@/components/round/SongEmbed"
import type { RoundPlatform } from "@/lib/round-types"

type ResultSubmission = {
  id: string
  url: string
  platform: RoundPlatform
  title: string | null
  artist: string | null
  user: { name: string }
  totalPoints: number
  votes: {
    id: string
    points: number
    comment: string | null
    voter: { name: string }
  }[]
}

export function ResultsReveal({
  submissions,
}: {
  submissions: ResultSubmission[]
}) {
  if (submissions.length === 0) {
    return <p className="text-muted-foreground">No eligible submissions.</p>
  }

  return (
    <ol className="space-y-4">
      {submissions.map((submission, index) => (
        <li key={submission.id}>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {index === 0 ? "Winner" : `Place ${index + 1}`}
                </p>
                <CardTitle>
                  {submission.title || submission.artist
                    ? [submission.title, submission.artist]
                        .filter(Boolean)
                        .join(" — ")
                    : "Untitled song"}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted by {submission.user.name}
                </p>
              </div>
              <p className="shrink-0 text-lg font-bold">
                {submission.totalPoints} pts
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <SongEmbed
                url={submission.url}
                platform={submission.platform}
              />
              <div className="space-y-2 border-t pt-3">
                <h3 className="text-sm font-semibold">Votes and comments</h3>
                {submission.votes.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No votes.</p>
                ) : (
                  <ul className="space-y-2">
                    {submission.votes.map((vote) => (
                      <li
                        key={vote.id}
                        className="flex flex-wrap items-baseline gap-x-2 text-sm"
                      >
                        <span className="font-medium">{vote.voter.name}</span>
                        <span className="text-muted-foreground">
                          {vote.points > 0 ? "+" : ""}
                          {vote.points} pts
                        </span>
                        {vote.comment && <span>— {vote.comment}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ol>
  )
}