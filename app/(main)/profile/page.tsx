import { Suspense } from "react"
import { redirect } from "next/navigation"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { DeleteAccountButton } from "@/components/profile/DeleteAccountButton"
import { ProfileNameForm } from "@/components/profile/ProfileNameForm"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
          <div className="h-9 w-40 animate-pulse rounded bg-muted" />
          <div className="h-48 animate-pulse rounded-xl bg-muted" />
          <div className="h-40 animate-pulse rounded-xl bg-muted" />
        </div>
      }
    >
      <ProfilePageContent />
    </Suspense>
  )
}

async function ProfilePageContent() {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      deletedAt: true,
      _count: {
        select: {
          memberships: {
            where: { leftAt: null, league: { archivedAt: null } },
          },
          leaguesOwned: { where: { archivedAt: null } },
          roundsCreated: true,
          submissions: true,
          votes: true,
        },
      },
    },
  })
  if (!user || user.deletedAt) redirect("/login")

  const stats = [
    { label: "Active leagues", value: user._count.memberships },
    { label: "Leagues owned", value: user._count.leaguesOwned },
    { label: "Rounds created", value: user._count.roundsCreated },
    { label: "Songs submitted", value: user._count.submissions },
    { label: "Votes cast", value: user._count.votes },
  ]

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <h1 className="text-3xl font-bold">Profile</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <ProfileNameForm name={user.name} />
          <div className="border-t pt-4">
            <p className="text-sm font-medium">Email</p>
            <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your stats</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border p-3">
                <dt className="text-sm text-muted-foreground">{stat.label}</dt>
                <dd className="mt-1 text-2xl font-semibold">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle>Delete account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Deleting your account will deactivate your profile and archive any
            leagues you own.
          </p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  )
}