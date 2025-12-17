"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Gift, Search, Loader2 } from "lucide-react"
import { searchGifs, getTrendingGifs, type TenorGif } from "@/lib/tenor"
import { cn } from "@/lib/utils"

interface GifPickerProps {
  onGifSelect: (gif: TenorGif) => void
  disabled?: boolean
  asMenuItem?: boolean
}

export function GifPicker({ onGifSelect, disabled, asMenuItem }: GifPickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [gifs, setGifs] = useState<TenorGif[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadTrending = useCallback(async () => {
    setIsLoading(true)
    try {
      const results = await getTrendingGifs(30)
      setGifs(results)
    } catch (error) {
      console.error("Failed to load trending GIFs:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen && gifs.length === 0) {
      loadTrending()
    }
  }, [isOpen, gifs.length, loadTrending])

  useEffect(() => {
    if (!searchQuery.trim()) {
      loadTrending()
      return
    }

    const timer = setTimeout(async () => {
      setIsLoading(true)
      try {
        const results = await searchGifs(searchQuery, 30)
        setGifs(results)
      } catch (error) {
        console.error("Failed to search GIFs:", error)
      } finally {
        setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery, loadTrending])

  const handleGifClick = (gif: TenorGif) => {
    onGifSelect(gif)
    setIsOpen(false)
    setSearchQuery("")
  }

  const triggerButton = asMenuItem ? (
    <Button
      variant="ghost"
      disabled={disabled}
      className="h-16 w-16 flex-col gap-1 p-1"
    >
      <Gift className="h-5 w-5 text-cyan-500" />
      <span className="text-[10px]">GIF</span>
    </Button>
  ) : (
    <Button
      variant="ghost"
      size="icon"
      disabled={disabled}
      className="shrink-0"
    >
      <Gift className="h-5 w-5" />
      <span className="sr-only">GIF picker</span>
    </Button>
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {triggerButton}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] p-0 flex flex-col">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle>Choose a GIF</DialogTitle>
        </DialogHeader>

        {/* Search input */}
        <div className="px-4 py-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search Tenor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* GIF grid */}
        <div className="flex-1 overflow-y-auto p-4 pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
              <Gift className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">
                {searchQuery ? "No GIFs found" : "Add Tenor API key to enable GIFs"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {gifs.map((gif) => (
                <button
                  key={gif.id}
                  className={cn(
                    "relative overflow-hidden rounded-lg bg-muted",
                    "hover:ring-2 hover:ring-primary transition-all"
                  )}
                  style={{ aspectRatio: gif.width / gif.height }}
                  onClick={() => handleGifClick(gif)}
                >
                  <img
                    src={gif.preview}
                    alt={gif.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tenor attribution */}
        <div className="p-2 border-t flex items-center justify-center">
          <span className="text-xs text-muted-foreground">Powered by Tenor</span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
