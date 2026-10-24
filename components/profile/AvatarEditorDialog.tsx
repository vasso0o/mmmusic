"use client"

import Image from "next/image"
import AvatarEditor, { type AvatarEditorRef } from "react-avatar-editor"
import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { updateUserAvatar } from "@/app/(main)/profile/actions"
import type { AvatarPreset } from "@/lib/avatar-presets"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const MAX_SOURCE_BYTES = 5 * 1024 * 1024

export function AvatarEditorDialog({
  name,
  image,
  presets,
}: {
  name: string
  image: string | null
  presets: AvatarPreset[]
}) {
  const router = useRouter()
  const editorRef = useRef<AvatarEditorRef>(null)
  const [open, setOpen] = useState(false)
  const [sourceImage, setSourceImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [presetId, setPresetId] = useState<string | null>(
    () => presets.find((preset) => preset.src === image)?.id ?? null
  )
  const [scale, setScale] = useState(1.2)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const initial = name.trim().charAt(0).toUpperCase() || "?"

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )

  function handleFileChange(file: File | undefined) {
    setError(null)
    setPresetId(null)
    setSourceImage(null)
    setPreviewUrl(null)
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.")
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("Choose an image smaller than 5 MB.")
      return
    }
    setSourceImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  function saveAvatar() {
    setError(null)
    startTransition(async () => {
      const formData = new FormData()
      if (presetId) {
        formData.set("preset", presetId)
      } else if (sourceImage) {
        const canvas = editorRef.current?.getImageScaledToCanvas()
        if (!canvas) {
          setError("Wait for the image crop to finish loading.")
          return
        }
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.82)
        )
        if (!blob) {
          setError("Could not crop this image. Try a different image.")
          return
        }
        if (blob.size > 128 * 1024) {
          setError("Cropped image is too large. Zoom in and try again.")
          return
        }
        formData.set("avatar", blob, "avatar.jpg")
      } else {
        setError("Choose a photo or one of the ready-made avatars.")
        return
      }

      const result = await updateUserAvatar(formData)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setOpen(false)
      router.refresh()
    })
  }

  const selectedPreset = presets.find((preset) => preset.id === presetId)
  const avatarPreview = selectedPreset?.src ?? image

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setError(null)
        setOpen(nextOpen)
      }}
    >
      <DialogTrigger
        render={
          <button
            type="button"
            aria-label="Edit profile avatar"
            className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-secondary text-sm font-semibold text-secondary-foreground transition-opacity hover:opacity-80"
          >
            {avatarPreview ? (
              <Image
                src={avatarPreview}
                alt=""
                fill
                sizes="36px"
                unoptimized
                className="object-cover"
              />
            ) : (
              initial
            )}
          </button>
        }
      />
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit your avatar</DialogTitle>
          <DialogDescription>
            Upload and crop a photo, or choose a ready-made avatar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <label className="block space-y-2 text-sm font-medium">
            Upload a photo
            <input
              type="file"
              accept="image/*"
              onChange={(event) => handleFileChange(event.target.files?.[0])}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-secondary-foreground"
            />
          </label>

          {previewUrl && sourceImage && (
            <div className="flex flex-col items-center gap-3">
              <AvatarEditor
                ref={editorRef}
                image={sourceImage}
                width={240}
                height={240}
                border={24}
                borderRadius={120}
                color={[0, 0, 0, 0.55]}
                scale={scale}
                onImageReady={() => setError(null)}
              />
              <label className="flex w-full items-center gap-3 text-sm">
                Zoom
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={scale}
                  onChange={(event) => setScale(Number(event.target.value))}
                  className="w-full"
                />
              </label>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Ready-made avatars</legend>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {presets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  aria-label={preset.label}
                  aria-pressed={presetId === preset.id}
                  onClick={() => {
                    setError(null)
                    setSourceImage(null)
                    setPresetId(preset.id)
                    setPreviewUrl(null)
                  }}
                  className={`relative aspect-square overflow-hidden rounded-full border-2 ${
                    presetId === preset.id
                      ? "border-primary ring-2 ring-primary/30"
                      : "border-transparent hover:border-muted-foreground/40"
                  }`}
                >
                  <Image
                    src={preset.src}
                    alt=""
                    fill
                    sizes="64px"
                    unoptimized
                  />
                </button>
              ))}
            </div>
          </fieldset>

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            disabled={pending}
            onClick={saveAvatar}
          >
            {pending ? "Saving..." : "Save avatar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
