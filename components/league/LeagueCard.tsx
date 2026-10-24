import Link from "next/link"
import Image from "next/image"
import { Users } from "lucide-react"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export function LeagueCard({
  id,
  title,
  image,
  memberCount,
}: {
  id: string
  title: string
  image: string | null
  memberCount: number
}) {
  return (
    <Link
      href={`/leagues/${id}`}
      className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Card className="relative isolate h-full min-h-[224px] overflow-hidden transition-colors hover:bg-muted/50">
        {image && (
          <Image
            src={image}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            unoptimized
            className="object-cover"
          />
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[hsl(270_50%_25%)] to-transparent"
        />
        <CardHeader className="relative z-10 mt-auto">
          <CardTitle className="truncate text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="relative z-10">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">Open league</p>
            <span className="flex items-center gap-1.5 text-sm text-foreground">
              <Users className="size-4" aria-hidden="true" />
              <span>
                {memberCount} {memberCount === 1 ? "member" : "members"}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}