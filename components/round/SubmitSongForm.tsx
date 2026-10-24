"use client"

import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type KeyboardEvent,
} from "react"
import { useRouter } from "next/navigation"
import { submitSong } from "@/app/(main)/leagues/round-actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ROUND_PLATFORMS, type RoundPlatform } from "@/lib/round-types"

type ExistingSubmission = {
  url: string
  platform: RoundPlatform
  title: string | null
  artist: string | null
  pitch: string | null
}

type SearchResult = {
  id: string
  url: string
  title: string
  artist: string
  thumbnail?: string
}

// Server route: GET /api/songs/search?platform=<value>&q=<query>
// Responds with { results: SearchResult[] }.
const SEARCH_ENDPOINT = "/api/songs/search"
const SEARCH_DEBOUNCE_MS = 300
const LISTBOX_ID = "song-search-results"

const PLATFORMS: ReadonlyArray<{ value: RoundPlatform; label: string }> = [
  { value: ROUND_PLATFORMS[0], label: "YouTube" },
  { value: ROUND_PLATFORMS[1], label: "SoundCloud" },
]

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debounced
}

export function SubmitSongForm({
  leagueId,
  roundId,
  existingSubmission,
}: {
  leagueId: string
  roundId: string
  existingSubmission: ExistingSubmission | null
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const initialPlatform =
    PLATFORMS.find((p) => p.value === existingSubmission?.platform)?.value ??
    PLATFORMS[0].value

  const [platform, setPlatform] = useState<RoundPlatform>(initialPlatform)
  const [selected, setSelected] = useState<SearchResult | null>(() =>
    existingSubmission
      ? {
          id: existingSubmission.url,
          url: existingSubmission.url,
          title: existingSubmission.title ?? "",
          artist: existingSubmission.artist ?? "",
        }
      : null,
  )

  const [query, setQuery] = useState("")
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  const [results, setResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)

  const wrapperRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const currentPlatformLabel =
    PLATFORMS.find((p) => p.value === platform)?.label ?? ""

  // Fetch-only effect: no setState in the body. Every state update happens in
  // an async callback. Reset of results/searching is triggered from the
  // handlers that change the query or platform.
  useEffect(() => {
    const q = debouncedQuery.trim()
    if (!q) return

    const controller = new AbortController()
    abortRef.current = controller

    const params = new URLSearchParams({ platform, q })
    fetch(`${SEARCH_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as {
          results?: SearchResult[]
          error?: string
        }
        if (!res.ok) {
          throw new Error(data.error ?? `Search failed (${res.status})`)
        }
        if (controller.signal.aborted) return
        setResults(data.results ?? [])
        setActiveIndex(-1)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return
        setSearchError(
          err instanceof Error
            ? err.message
            : "Couldn't search right now. Please try again."
        )
        setResults([])
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false)
      })

    return () => controller.abort()
  }, [debouncedQuery, platform])

  // Outside-click close. State changes only in the event callback, not the body.
  useEffect(() => {
    if (!open) return
    function handlePointerDown(event: PointerEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("pointerdown", handlePointerDown)
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown)
  }, [open])

  function focusInput() {
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  function resetSearchState() {
    abortRef.current?.abort()
    abortRef.current = null
    setQuery("")
    setResults([])
    setSearching(false)
    setSearchError(null)
    setActiveIndex(-1)
    setOpen(false)
  }

  function chooseResult(result: SearchResult) {
    resetSearchState()
    setSelected(result)
  }

  function changePlatform(next: RoundPlatform) {
    if (next === platform) return
    setPlatform(next)
    setSelected(null)
    resetSearchState()
    focusInput()
  }

  function clearSelection() {
    setSelected(null)
    focusInput()
  }

  function handleQueryChange(value: string) {
    setQuery(value)
    setOpen(true)
    setActiveIndex(-1)
    setSearchError(null)
    const hasQuery = value.trim().length > 0
    setSearching(hasQuery)
    if (!hasQuery) {
      abortRef.current?.abort()
      abortRef.current = null
      setResults([])
    }
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setOpen(true)
      if (results.length > 0) {
        setActiveIndex((i) => Math.min(i + 1, results.length - 1))
      }
    } else if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, -1))
    } else if (event.key === "Enter") {
      if (open && activeIndex >= 0 && results[activeIndex]) {
        event.preventDefault()
        chooseResult(results[activeIndex])
      }
    } else if (event.key === "Escape") {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  function handleSubmit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!selected) {
      setError("Pick a song from the search results first.")
      return
    }

    const formData = new FormData(event.currentTarget)
    startTransition(async () => {
      try {
        const result = await submitSong(leagueId, roundId, formData)
        if (!result.ok) {
          setError(result.error)
          return
        }
        router.push(`/leagues/${leagueId}`)
        router.refresh()
      } catch {
        setError("Something went wrong. Please try again.")
      }
    })
  }

  const showDropdown =
    open && !selected && debouncedQuery.trim().length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border p-5">
      <input type="hidden" name="url" value={selected?.url ?? ""} />
      <input type="hidden" name="platform" value={platform} />
      {selected?.title && (
        <input type="hidden" name="title" value={selected.title} />
      )}
      {selected?.artist && (
        <input type="hidden" name="artist" value={selected.artist} />
      )}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Platform</legend>
        <div className="flex gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p.value}
              type="button"
              aria-pressed={platform === p.value}
              onClick={() => changePlatform(p.value)}
              className={
                platform === p.value
                  ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
                  : "rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-accent"
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </fieldset>

      <div className="space-y-2">
        <label htmlFor="song-search" className="text-sm font-medium">
          Song
        </label>

        {selected ? (
          <div className="flex items-center gap-3 rounded-lg border p-3">
            {selected.thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={selected.thumbnail}
                alt=""
                className="h-10 w-16 shrink-0 rounded object-cover"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {selected.title || selected.url}
              </p>
              {selected.artist && (
                <p className="truncate text-xs text-muted-foreground">
                  {selected.artist}
                </p>
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearSelection}
            >
              Change
            </Button>
          </div>
        ) : (
          <div ref={wrapperRef} className="relative">
            <Input
              ref={inputRef}
              id="song-search"
              type="search"
              value={query}
              autoComplete="off"
              placeholder={`Search ${currentPlatformLabel}…`}
              role="combobox"
              aria-expanded={showDropdown}
              aria-controls={LISTBOX_ID}
              aria-autocomplete="list"
              aria-activedescendant={
                showDropdown && activeIndex >= 0
                  ? `song-option-${activeIndex}`
                  : undefined
              }
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              onKeyDown={handleSearchKeyDown}
            />

            {showDropdown && (
              <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md">
                {searching && (
                  <p className="border-b p-2 text-xs text-muted-foreground">
                    Searching…
                  </p>
                )}
                {!searching && searchError && (
                  <p className="p-3 text-sm text-destructive">{searchError}</p>
                )}
                {!searching && !searchError && results.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">
                    No results.
                  </p>
                )}
                {results.length > 0 && (
                  <ul
                    id={LISTBOX_ID}
                    role="listbox"
                    aria-label="Search results"
                    className="max-h-72 divide-y overflow-auto"
                  >
                    {results.map((result, index) => (
                      <li
                        key={result.id}
                        id={`song-option-${index}`}
                        role="option"
                        aria-selected={activeIndex === index}
                        onMouseEnter={() => setActiveIndex(index)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => chooseResult(result)}
                        className={
                          activeIndex === index
                            ? "flex cursor-pointer items-center gap-3 bg-accent p-2"
                            : "flex cursor-pointer items-center gap-3 p-2 hover:bg-accent"
                        }
                      >
                        {result.thumbnail && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={result.thumbnail}
                            alt=""
                            className="h-10 w-16 shrink-0 rounded object-cover"
                          />
                        )}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">
                            {result.title}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {result.artist}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <label htmlFor="song-comment" className="text-sm font-medium">
          Leave a comment (optional)
        </label>
        <textarea
          id="song-comment"
          name="pitch"
          maxLength={1000}
          rows={3}
          defaultValue={existingSubmission?.pitch ?? ""}
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
        />
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" disabled={pending || !selected}>
        {pending
          ? "Saving..."
          : existingSubmission
            ? "Update submission"
            : "Submit song"}
      </Button>
    </form>
  )
}