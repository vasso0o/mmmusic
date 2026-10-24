"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

const ROTATE_MS = 3000

export default function HeroText() {
  const [isDownvote, setIsDownvote] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setIsDownvote((value) => !value), ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <h1 className="text-5xl leading-[0.85] font-black tracking-tighter text-white uppercase sm:text-6xl lg:text-7xl xl:text-8xl">
      <span
        key={isDownvote ? "down" : "vote"}
        className="inline-block animate-word-in"
      >
        <span
          className={cn(
            "inline-block will-change-transform",
            isDownvote && "animate-tremble text-red-500"
          )}
        >
          {isDownvote ? "DOWNVOTE" : "VOTE"}
          {isDownvote && (
            <span aria-hidden="true" className="ml-2 inline-block">
              😈
            </span>
          )}
        </span>
      </span>
      <span className="mt-1 block">YOUR FRIEND&apos;S</span>
      <span className="block">MUSIC</span>
    </h1>
  )
}
