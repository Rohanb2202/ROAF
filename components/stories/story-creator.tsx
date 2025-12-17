"use client"

import { useState, useRef, useEffect } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X, Camera, SwitchCamera, Check, Loader2, Image as ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { FILTERS, type FilterType, processImageWithFilter } from "@/lib/image-filters"

interface StoryCreatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreateStory: (imageDataUrl: string, filter: FilterType) => void
}

export function StoryCreator({ open, onOpenChange, onCreateStory }: StoryCreatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [mode, setMode] = useState<"camera" | "preview">("camera")
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<FilterType>("none")
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [previewImage, setPreviewImage] = useState<HTMLImageElement | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startCamera = async () => {
    setIsLoading(true)
    setCameraError(null)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    try {
      // Simple camera access like microphone - just { video: true }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (error: any) {
      console.error("Camera error:", error)
      if (error.name === "NotFoundError") {
        setCameraError("No camera found. Use the gallery to upload an image instead.")
      } else if (error.name === "NotAllowedError") {
        setCameraError("Camera access denied. Please allow camera permissions.")
      } else {
        setCameraError("Could not access camera. Try uploading from gallery.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  useEffect(() => {
    if (open && mode === "camera") {
      startCamera()
    }

    if (!open) {
      stopCamera()
      setCapturedImage(null)
      setSelectedFilter("none")
      setMode("camera")
      setPreviewImage(null)
      setCameraError(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode])

  const handleCapture = () => {
    if (!videoRef.current) return

    const video = videoRef.current
    const canvas = document.createElement("canvas")
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0)

    const dataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setCapturedImage(dataUrl)
    setMode("preview")
    stopCamera()

    // Create image element for filter processing
    const img = new Image()
    img.onload = () => setPreviewImage(img)
    img.src = dataUrl
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setCapturedImage(dataUrl)
      setMode("preview")
      stopCamera()

      const img = new Image()
      img.onload = () => setPreviewImage(img)
      img.src = dataUrl
    }
    reader.readAsDataURL(file)
    e.target.value = ""
  }

  const handleRetake = () => {
    setCapturedImage(null)
    setSelectedFilter("none")
    setMode("camera")
    setPreviewImage(null)
  }

  const handlePost = async () => {
    if (!previewImage) return

    setIsProcessing(true)

    try {
      const processedImage = await processImageWithFilter(previewImage, selectedFilter, 1080, 1920)
      onCreateStory(processedImage, selectedFilter)
      handleClose()
    } catch (error) {
      console.error("Failed to process image:", error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    setSelectedFilter("none")
    setMode("camera")
    setPreviewImage(null)
    onOpenChange(false)
  }

  const handleSwitchCamera = async () => {
    // Toggle facing mode and restart camera
    const newFacingMode = facingMode === "user" ? "environment" : "user"
    setFacingMode(newFacingMode)

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacingMode }
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
    } catch (error) {
      console.error("Failed to switch camera:", error)
    }
  }

  const getFilterPreviewStyle = (filterId: FilterType): React.CSSProperties => {
    const filter = FILTERS.find(f => f.id === filterId)
    if (filter?.css) {
      return { filter: filter.css }
    }
    return {}
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        showCloseButton={false}
        className="!max-w-none !w-screen !h-[100dvh] !p-0 !m-0 !rounded-none !border-0 !top-0 !left-0 !translate-x-0 !translate-y-0 bg-black overflow-hidden"
      >
        <DialogTitle className="sr-only">Create Story</DialogTitle>

        <div className="relative w-full h-full flex flex-col">
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-4 z-20 text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Camera Mode */}
          {mode === "camera" && (
            <>
              <div className="flex-1 relative overflow-hidden">
                {isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
                {cameraError ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 p-8 text-center">
                    <Camera className="h-16 w-16 text-white/50 mb-4" />
                    <p className="text-white/70 mb-6">{cameraError}</p>
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      className="gap-2"
                    >
                      <ImageIcon className="h-5 w-5" />
                      Choose from Gallery
                    </Button>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "w-full h-full object-cover",
                      facingMode === "user" && "scale-x-[-1]"
                    )}
                  />
                )}
              </div>

              {/* Camera Controls */}
              <div className="absolute bottom-8 left-0 right-0 flex items-center justify-center gap-8">
                {/* Gallery Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 text-white hover:bg-white/20"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <ImageIcon className="h-6 w-6" />
                </Button>

                {/* Capture Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-20 w-20 rounded-full bg-white hover:bg-white/90"
                  onClick={handleCapture}
                >
                  <div className="h-16 w-16 rounded-full border-4 border-black" />
                </Button>

                {/* Switch Camera */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-12 w-12 text-white hover:bg-white/20"
                  onClick={handleSwitchCamera}
                >
                  <SwitchCamera className="h-6 w-6" />
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
              />
            </>
          )}

          {/* Preview Mode */}
          {mode === "preview" && capturedImage && (
            <>
              {/* Preview Image with Filter */}
              <div className="flex-1 relative overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Preview"
                  className="w-full h-full object-cover"
                  style={getFilterPreviewStyle(selectedFilter)}
                />

                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-white" />
                  </div>
                )}
              </div>

              {/* Filter Selector */}
              <div className="absolute bottom-24 left-0 right-0 px-4">
                <div className="overflow-x-auto pb-4 scrollbar-hide">
                  <div className="flex gap-3 w-max">
                    {FILTERS.map((filter) => (
                      <button
                        key={filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                        className={cn(
                          "flex flex-col items-center gap-1 transition-all",
                          selectedFilter === filter.id && "scale-110"
                        )}
                      >
                        <div
                          className={cn(
                            "w-16 h-16 rounded-lg overflow-hidden border-2",
                            selectedFilter === filter.id
                              ? "border-white"
                              : "border-transparent"
                          )}
                        >
                          <img
                            src={capturedImage}
                            alt={filter.name}
                            className="w-full h-full object-cover"
                            style={getFilterPreviewStyle(filter.id)}
                          />
                        </div>
                        <span className="text-white text-xs font-medium">
                          {filter.name}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-8 px-4">
                <Button
                  variant="ghost"
                  className="text-white hover:bg-white/20 px-6"
                  onClick={handleRetake}
                  disabled={isProcessing}
                >
                  Retake
                </Button>

                <Button
                  className="px-8 gap-2"
                  onClick={handlePost}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Check className="h-5 w-5" />
                  )}
                  Post Story
                </Button>
              </div>
            </>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
