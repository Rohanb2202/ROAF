"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Camera, SwitchCamera, X, Check, RotateCcw } from "lucide-react"

interface CameraCaptureProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCapture: (file: File) => void
}

export function CameraCapture({ open, onOpenChange, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment")
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    // Stop existing stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      setIsLoading(false)
    } catch (err) {
      console.error("Camera error:", err)
      setError("Unable to access camera. Please ensure camera permissions are granted.")
      setIsLoading(false)
    }
  }, [facingMode])

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }, [])

  useEffect(() => {
    if (open && !capturedImage) {
      startCamera()
    }

    return () => {
      if (!open) {
        stopCamera()
        setCapturedImage(null)
      }
    }
  }, [open, capturedImage, startCamera, stopCamera])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Flip horizontally for front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }

    ctx.drawImage(video, 0, 0)

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9)
    setCapturedImage(imageDataUrl)
    stopCamera()
  }

  const handleRetake = () => {
    setCapturedImage(null)
    startCamera()
  }

  const handleConfirm = async () => {
    if (!capturedImage) return

    // Convert data URL to File
    const response = await fetch(capturedImage)
    const blob = await response.blob()
    const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" })

    onCapture(file)
    onOpenChange(false)
    setCapturedImage(null)
  }

  const handleSwitchCamera = () => {
    setFacingMode(prev => prev === "user" ? "environment" : "user")
  }

  const handleClose = () => {
    stopCamera()
    setCapturedImage(null)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black">
        <DialogTitle className="sr-only">Camera Capture</DialogTitle>

        <div className="relative aspect-[3/4] sm:aspect-video w-full bg-black">
          {/* Video Preview */}
          {!capturedImage && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""}`}
            />
          )}

          {/* Captured Image Preview */}
          {capturedImage && (
            <img
              src={capturedImage}
              alt="Captured"
              className="w-full h-full object-cover"
            />
          )}

          {/* Loading State */}
          {isLoading && !capturedImage && (
            <div className="absolute inset-0 flex items-center justify-center bg-black">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black p-4">
              <p className="text-white text-center">{error}</p>
            </div>
          )}

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 text-white hover:bg-white/20"
            onClick={handleClose}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Camera Controls */}
          {!capturedImage && !error && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-8">
              {/* Switch Camera */}
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20 h-12 w-12"
                onClick={handleSwitchCamera}
              >
                <SwitchCamera className="h-6 w-6" />
              </Button>

              {/* Capture Button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-white hover:bg-white/90"
                onClick={handleCapture}
                disabled={isLoading}
              >
                <Camera className="h-8 w-8 text-black" />
              </Button>

              {/* Spacer for alignment */}
              <div className="h-12 w-12" />
            </div>
          )}

          {/* Captured Image Controls */}
          {capturedImage && (
            <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-8">
              {/* Retake */}
              <Button
                variant="ghost"
                size="icon"
                className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30 text-white"
                onClick={handleRetake}
              >
                <RotateCcw className="h-6 w-6" />
              </Button>

              {/* Confirm */}
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600"
                onClick={handleConfirm}
              >
                <Check className="h-8 w-8 text-white" />
              </Button>
            </div>
          )}
        </div>

        {/* Hidden canvas for capturing */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
