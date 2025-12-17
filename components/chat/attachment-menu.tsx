"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Plus, Image as ImageIcon, Video, Camera } from "lucide-react"
import { CameraCapture } from "./camera-capture"

interface AttachmentMenuProps {
  onImageSelect: (file: File) => void
  onVideoSelect: (file: File) => void
  onCameraCapture: (file: File) => void
  disabled?: boolean
}

export function AttachmentMenu({
  onImageSelect,
  onVideoSelect,
  onCameraCapture,
  disabled,
}: AttachmentMenuProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const [showCamera, setShowCamera] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onImageSelect(file)
    }
    e.target.value = ""
  }

  const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onVideoSelect(file)
    }
    e.target.value = ""
  }

  const handleCameraClick = () => {
    setMenuOpen(false)
    setShowCamera(true)
  }

  const handleCameraCapture = (file: File) => {
    onCameraCapture(file)
    setShowCamera(false)
  }

  return (
    <>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageChange}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={handleVideoChange}
      />

      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <Plus className="h-5 w-5" />
            <span className="sr-only">Attachments</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="top"
          align="start"
          className="w-auto p-2"
        >
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 flex-col gap-1"
              onClick={handleCameraClick}
            >
              <Camera className="h-5 w-5 text-primary" />
              <span className="text-[10px]">Camera</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 flex-col gap-1"
              onClick={() => {
                setMenuOpen(false)
                imageInputRef.current?.click()
              }}
            >
              <ImageIcon className="h-5 w-5 text-green-500" />
              <span className="text-[10px]">Photo</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-12 w-12 flex-col gap-1"
              onClick={() => {
                setMenuOpen(false)
                videoInputRef.current?.click()
              }}
            >
              <Video className="h-5 w-5 text-blue-500" />
              <span className="text-[10px]">Video</span>
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      <CameraCapture
        open={showCamera}
        onOpenChange={setShowCamera}
        onCapture={handleCameraCapture}
      />
    </>
  )
}
