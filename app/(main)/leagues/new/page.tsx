import { CreateLeagueForm } from "@/components/league/CreateLeagueForm"

export default function NewLeaguePage() {
  return (
    <div className="mx-auto w-full max-w-5xl py-8">
      <h1 className="text-2xl font-bold">Create a league</h1>
      <CreateLeagueForm />
    </div>
  )
}