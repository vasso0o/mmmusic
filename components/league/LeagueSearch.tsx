"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, Search } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type SearchResult = {
  id: string
  name: string
  owner: { name: string }
}

export function LeagueSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const trimmedQuery = query.trim()
    if (!trimmedQuery) return

    const controller = new AbortController()

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/leagues/search?q=${encodeURIComponent(trimmedQuery)}`,
          { signal: controller.signal }
        )
        if (!response.ok) {
          throw new Error("League search request failed.")
        }

        const data = (await response.json()) as SearchResult[]
        setResults(data)
      } catch (requestError) {
        if (!controller.signal.aborted) {
          console.error("League search failed:", requestError)
          setError("Unable to search leagues. Please try again.")
          setResults([])
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, 300)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [query])

  return (
    <div className="relative w-full max-w-2xl">
      <div className="relative">
        <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search leagues by name..."
          className="pl-8"
          value={query}
          onChange={(event) => {
            const value = event.target.value
            setQuery(value)
            setIsOpen(Boolean(value.trim()))
            setResults([])
            setError(null)
            setIsLoading(Boolean(value.trim()))
          }}
          onFocus={() => {
            if (query.trim()) setIsOpen(true)
          }}
          onBlur={() => {
            window.setTimeout(() => setIsOpen(false), 150)
          }}
          aria-label="Search leagues by name"
          aria-expanded={isOpen}
        />
      </div>

      {isOpen && query.trim() && (
        <Card className="absolute top-full z-10 mt-1 max-h-60 w-full overflow-y-auto">
          {isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Searching...</p>
          ) : error ? (
            <p className="p-3 text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : results.length > 0 ? (
            <ul className="divide-y">
              {results.map((league) => (
                <li key={league.id}>
                  <Link
                    href={`/leagues/${league.id}`}
                    className="flex items-center justify-between p-3 hover:bg-muted/50"
                  >
                    <span>
                      <span className="block font-medium">{league.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        Owner: {league.owner.name}
                      </span>
                    </span>
                    <span className="flex items-center text-sm">
                      Open <ArrowRight className="ml-1 size-4" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-3 text-sm text-muted-foreground">
              No leagues found.
            </p>
          )}
        </Card>
      )}
    </div>
  )
}