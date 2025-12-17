"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"

interface ProfileAvatarProps {
  photoURL?: string | null
  displayName?: string
  email?: string
  size?: "sm" | "md" | "lg" | "xl"
  expandable?: boolean
  className?: string
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-14 w-14",
  xl: "h-20 w-20",
}

const textSizeClasses = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-lg",
  xl: "text-2xl",
}

export function ProfileAvatar({
  photoURL,
  displayName,
  email,
  size = "md",
  expandable = true,
  className,
}: ProfileAvatarProps) {
  const [isOpen, setIsOpen] = useState(false)

  const getInitials = () => {
    if (displayName) return displayName.slice(0, 2).toUpperCase()
    if (email) return email.slice(0, 2).toUpperCase()
    return "U"
  }

  const handleClick = () => {
    if (expandable && photoURL) {
      setIsOpen(true)
    }
  }

  return (
    <>
      <Avatar
        className={cn(
          sizeClasses[size],
          expandable && photoURL && "cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all",
          className
        )}
        onClick={handleClick}
      >
        {photoURL && <AvatarImage src={photoURL} alt={displayName || "Profile"} />}
        <AvatarFallback className={cn("bg-primary/10 text-primary", textSizeClasses[size])}>
          {getInitials()}
        </AvatarFallback>
      </Avatar>

      {/* Expanded view dialog */}
      {expandable && photoURL && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent
            className="max-w-md p-0 bg-black/95 border-none overflow-hidden"
            showCloseButton={false}
            aria-describedby={undefined}
          >
            <DialogTitle className="sr-only">Profile photo</DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-6 w-6" />
            </Button>

            <div className="flex flex-col items-center p-6">
              <img
                src={photoURL}
                alt={displayName || "Profile"}
                className="w-64 h-64 rounded-full object-cover"
              />
              {displayName && (
                <h3 className="text-white text-xl font-semibold mt-4">{displayName}</h3>
              )}
              {email && (
                <p className="text-white/70 text-sm mt-1">{email}</p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
