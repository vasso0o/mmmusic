"use client"

import Image from "next/image"
import AvatarEditor, { type AvatarEditorRef } from "react-avatar-editor"
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react"

const MAX_SOURCE_BYTES = 10 * 1024 * 1024
const MAX_CROPPED_BYTES = 800 * 1024

export type LeagueImageInputHandle = {
  getCroppedImage: () => Promise<File | null | undefined>
}

export const LeagueImageInput = forwardRef<
  LeagueImageInputHandle,
  { currentImage?: string | null }
>(function LeagueImageInput({ currentImage }, ref) {
  const editorRef = useRef<AvatarEditorRef>(null)
  const [sourceImage, setSourceImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [scale, setScale] = useState(1.1)
  const [error, setError] = useState<string | null>(null)
  const [imageReady, setImageReady] = useState(false)

  useEffect(
    () => () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    },
    [previewUrl]
  )

  useImperativeHandle(
    ref,
    () => ({
      async getCroppedImage() {
        if (error) return null
        if (!sourceImage) return undefined
        if (!imageReady) {
          setError("Wait for the image crop to finish loading.")
          return null
        }
        const canvas = editorRef.current?.getImageScaledToCanvas()
        if (!canvas) {
          setError("Wait for the image crop to finish loading.")
          return null
        }

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/jpeg", 0.82)
        )
        if (!blob) {
          setError("Could not crop this image. Try a different image.")
          return null
        }
        if (blob.size > MAX_CROPPED_BYTES) {
          setError("Cropped image is too large. Zoom in and try again.")
          return null
        }

        setError(null)
        return new File([blob], "league-cover.jpg", { type: "image/jpeg" })
      },
    }),
    [error, imageReady, sourceImage]
  )

  function handleFileChange(file: File | undefined) {
    setError(null)
    setSourceImage(null)
    setPreviewUrl(null)
    setImageReady(false)
    if (!file) return
    if (!file.type.startsWith("image/")) {
      setError("Choose an image file.")
      return
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("Choose an image smaller than 10 MB.")
      return
    }

    setSourceImage(file)
    setPreviewUrl(URL.createObjectURL(file))
  }

  return (
    <div className="space-y-3">
      {currentImage && !previewUrl && (
        <div className="relative h-32 w-full overflow-hidden rounded-md bg-muted">
          <Image
            src={currentImage}
            alt="Current league cover"
            fill
            sizes="(max-width: 672px) 100vw, 672px"
            unoptimized
            className="object-cover"
          />
        </div>
      )}
      <label className="block space-y-2 text-sm font-medium">
        Cover Image (Optional)
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
            width={960}
            height={360}
            border={20}
            borderRadius={12}
            color={[0, 0, 0, 0.55]}
            scale={scale}
            onImageReady={() => setImageReady(true)}
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

      <p className="text-xs text-muted-foreground">
        Crop a JPG, PNG, or other image. The saved cover is JPEG, up to 800 KB.
        Leave the field empty to keep the current image.
      </p>
      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  )
})
