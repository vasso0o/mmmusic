import { Music, PlusCircle, Trophy } from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function FakeLeagueDashboard() {
  return (
    <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
      <div className="space-y-6 md:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Music className="size-5" />
              Round 1: 90s Hip Hop
            </CardTitle>
            <CardDescription>Submissions close in 2 days.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="placeholder-song" className="text-sm font-medium">
                Add your song
              </label>
              <div className="flex gap-2">
                <Input
                  id="placeholder-song"
                  placeholder="Paste a YouTube or SoundCloud link..."
                  disabled
                />
                <Button disabled>Submit</Button>
              </div>
            </div>
            <div className="mt-4 rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No songs submitted yet. Be the first!
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Past Rounds</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No past rounds yet.</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="size-5" />
              Current Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Standings will appear once the first round is complete.
            </p>
          </CardContent>
        </Card>

        <Button className="w-full" variant="outline" disabled>
          <PlusCircle className="size-4" />
          Create Next Round (Coming Soon)
        </Button>
      </div>
    </div>
  )
}
