import Image from "next/image"
import { Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type PublicLeague = {
  name: string
  description: string | null
  image: string | null
}

export function PublicLeagueView({
  league,
  memberCount,
}: {
  league: PublicLeague
  memberCount: number
}) {
  return (
    <Card className="max-w-2xl overflow-hidden">
      {league.image && (
        <div className="relative h-64 w-full bg-muted">
          <Image
            src={league.image}
            alt={`${league.name} cover`}
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            unoptimized
            className="object-cover"
          />
        </div>
      )}
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="text-2xl">{league.name}</CardTitle>
          <div className="flex shrink-0 items-center gap-1.5 rounded-full bg-secondary px-3 py-1 text-sm font-medium text-secondary-foreground">
            <Users className="size-4" />
            {memberCount} {memberCount === 1 ? "Member" : "Members"}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="whitespace-pre-wrap text-sm text-foreground/90">
          {league.description || "No description provided."}
        </p>
      </CardContent>
    </Card>
  )
}
