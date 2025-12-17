"use client"

import { useEffect, useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Phone, PhoneOff, Video } from "lucide-react"
import type { CallSession } from "@/lib/webrtc/call-service"
import type { UserProfile } from "@/lib/firebase/firestore"

interface IncomingCallProps {
  call: CallSession & { id: string }
  caller: UserProfile | null
  onAccept: () => void
  onReject: () => void
}

export function IncomingCall({ call, caller, onAccept, onReject }: IncomingCallProps) {
  const [isRinging, setIsRinging] = useState(true)

  // Play ringtone
  useEffect(() => {
    // Create a simple ringtone using Web Audio API
    let audioContext: AudioContext | null = null
    let oscillator: OscillatorNode | null = null
    let gainNode: GainNode | null = null
    let intervalId: NodeJS.Timeout | null = null

    const playRing = () => {
      try {
        audioContext = new AudioContext()
        oscillator = audioContext.createOscillator()
        gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        oscillator.frequency.value = 440 // A4 note
        oscillator.type = "sine"
        gainNode.gain.value = 0.1

        oscillator.start()

        // Ring pattern
        let ringCount = 0
        intervalId = setInterval(() => {
          if (gainNode) {
            gainNode.gain.value = ringCount % 2 === 0 ? 0.1 : 0
          }
          ringCount++
          if (ringCount > 6) {
            ringCount = 0
          }
        }, 500)
      } catch (error) {
        console.error("Failed to play ringtone:", error)
      }
    }

    if (isRinging) {
      playRing()
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
      if (oscillator) oscillator.stop()
      if (audioContext) audioContext.close()
    }
  }, [isRinging])

  const handleAccept = () => {
    setIsRinging(false)
    onAccept()
  }

  const handleReject = () => {
    setIsRinging(false)
    onReject()
  }

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-sm p-0 overflow-hidden bg-gradient-to-b from-purple-900 to-black border-none">
        <DialogTitle className="sr-only">Incoming Call</DialogTitle>

        <div className="p-8 flex flex-col items-center">
          {/* Call Type Icon */}
          <div className="mb-4">
            {call.type === "video" ? (
              <Video className="h-8 w-8 text-white/70" />
            ) : (
              <Phone className="h-8 w-8 text-white/70" />
            )}
          </div>

          {/* Caller Avatar */}
          <div className="w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-white/20 animate-pulse">
            {caller?.photoURL ? (
              <img
                src={caller.photoURL}
                alt={caller.displayName || "Caller"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-3xl font-bold">
                {(caller?.displayName || "U")[0].toUpperCase()}
              </div>
            )}
          </div>

          {/* Caller Name */}
          <h2 className="text-white text-xl font-semibold mb-1">
            {caller?.displayName || "Unknown"}
          </h2>

          {/* Call Type */}
          <p className="text-white/70 text-sm mb-8">
            Incoming {call.type} call...
          </p>

          {/* Action Buttons */}
          <div className="flex items-center justify-center gap-12">
            {/* Reject */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30"
                onClick={handleReject}
              >
                <PhoneOff className="h-8 w-8" />
              </Button>
              <span className="text-white/70 text-sm">Decline</span>
            </div>

            {/* Accept */}
            <div className="flex flex-col items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg shadow-green-500/30 animate-bounce"
                onClick={handleAccept}
              >
                {call.type === "video" ? (
                  <Video className="h-8 w-8" />
                ) : (
                  <Phone className="h-8 w-8" />
                )}
              </Button>
              <span className="text-white/70 text-sm">Accept</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
