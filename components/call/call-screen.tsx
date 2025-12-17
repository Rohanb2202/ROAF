"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Phone,
  PhoneOff,
  Mic,
  MicOff,
  Video,
  VideoOff,
  SwitchCamera,
  Volume2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { CallService, type CallType, type CallStatus } from "@/lib/webrtc/call-service"
import type { UserProfile } from "@/lib/firebase/firestore"

interface CallScreenProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  callType: CallType
  isIncoming: boolean
  callId?: string
  currentUserId: string
  otherUser: UserProfile | null
  onCallEnd: () => void
}

export function CallScreen({
  open,
  onOpenChange,
  callType,
  isIncoming,
  callId,
  currentUserId,
  otherUser,
  onCallEnd,
}: CallScreenProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null)
  const remoteVideoRef = useRef<HTMLVideoElement>(null)
  const callServiceRef = useRef<CallService | null>(null)

  const [callStatus, setCallStatus] = useState<CallStatus>(isIncoming ? "ringing" : "calling")
  const [isMuted, setIsMuted] = useState(false)
  const [isVideoOff, setIsVideoOff] = useState(false)
  const [callDuration, setCallDuration] = useState(0)
  const [hasRemoteStream, setHasRemoteStream] = useState(false)

  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize call service
  useEffect(() => {
    if (!open || !currentUserId) return

    const callService = new CallService(currentUserId)
    callServiceRef.current = callService

    // Set up callbacks
    callService.onLocalStream = (stream) => {
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }
    }

    callService.onRemoteStream = (stream) => {
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream
      }
      setHasRemoteStream(true)
    }

    callService.onCallStatusChange = (status) => {
      setCallStatus(status)

      if (status === "connected") {
        // Start duration timer
        durationIntervalRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1)
        }, 1000)
      }
    }

    callService.onCallEnded = () => {
      handleClose()
    }

    // Start or answer call
    const initializeCall = async () => {
      try {
        if (isIncoming && callId) {
          // Wait for user to accept
        } else if (otherUser) {
          await callService.startCall(otherUser.uid, callType)
        }
      } catch (error) {
        console.error("Failed to initialize call:", error)
        handleClose()
      }
    }

    if (!isIncoming) {
      initializeCall()
    }

    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current)
      }
    }
  }, [open, currentUserId, isIncoming, callId, otherUser, callType])

  const handleAcceptCall = async () => {
    if (!callServiceRef.current || !callId) return

    try {
      await callServiceRef.current.answerCall(callId)
    } catch (error) {
      console.error("Failed to accept call:", error)
    }
  }

  const handleRejectCall = async () => {
    if (!callServiceRef.current || !callId) return

    try {
      await callServiceRef.current.rejectCall(callId)
      handleClose()
    } catch (error) {
      console.error("Failed to reject call:", error)
    }
  }

  const handleEndCall = async () => {
    if (!callServiceRef.current) return

    try {
      await callServiceRef.current.endCall()
    } catch (error) {
      console.error("Failed to end call:", error)
    }
    handleClose()
  }

  const handleClose = useCallback(() => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current)
    }

    if (callServiceRef.current) {
      callServiceRef.current.destroy()
      callServiceRef.current = null
    }

    setCallDuration(0)
    setHasRemoteStream(false)
    setCallStatus("ended")
    onCallEnd()
    onOpenChange(false)
  }, [onCallEnd, onOpenChange])

  const handleToggleMute = () => {
    if (callServiceRef.current) {
      const muted = callServiceRef.current.toggleMute()
      setIsMuted(muted)
    }
  }

  const handleToggleVideo = () => {
    if (callServiceRef.current) {
      const videoOff = callServiceRef.current.toggleVideo()
      setIsVideoOff(videoOff)
    }
  }

  const handleSwitchCamera = async () => {
    if (callServiceRef.current) {
      await callServiceRef.current.switchCamera()
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  const getStatusText = () => {
    switch (callStatus) {
      case "calling":
        return "Calling..."
      case "ringing":
        return "Incoming call"
      case "connected":
        return formatDuration(callDuration)
      case "ended":
        return "Call ended"
      case "rejected":
        return "Call rejected"
      case "missed":
        return "Missed call"
      default:
        return ""
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-full h-full sm:max-w-md sm:h-[90vh] p-0 m-0 rounded-none sm:rounded-2xl bg-black overflow-hidden">
        <DialogTitle className="sr-only">
          {callType === "video" ? "Video Call" : "Voice Call"}
        </DialogTitle>

        <div className="relative w-full h-full flex flex-col">
          {/* Video Call UI */}
          {callType === "video" ? (
            <>
              {/* Remote Video (Full Screen) */}
              <div className="flex-1 relative bg-gray-900">
                {hasRemoteStream ? (
                  <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-4xl font-bold mx-auto mb-4">
                        {(otherUser?.displayName || "U")[0].toUpperCase()}
                      </div>
                      <p className="text-white text-xl font-semibold">
                        {otherUser?.displayName || "Unknown"}
                      </p>
                      <p className="text-white/70 mt-2">{getStatusText()}</p>
                    </div>
                  </div>
                )}

                {/* Local Video (Picture-in-Picture) */}
                <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden bg-gray-800 border-2 border-white/20 shadow-lg">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className={cn(
                      "w-full h-full object-cover scale-x-[-1]",
                      isVideoOff && "hidden"
                    )}
                  />
                  {isVideoOff && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-800">
                      <VideoOff className="h-8 w-8 text-white/50" />
                    </div>
                  )}
                </div>

                {/* Call Status */}
                <div className="absolute top-4 left-4">
                  <p className="text-white bg-black/50 px-3 py-1 rounded-full text-sm">
                    {getStatusText()}
                  </p>
                </div>
              </div>
            </>
          ) : (
            /* Voice Call UI */
            <div className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-purple-900 to-black p-8">
              {/* Avatar */}
              <div className="relative mb-6">
                <div className={cn(
                  "w-32 h-32 rounded-full overflow-hidden",
                  callStatus === "connected" && "ring-4 ring-green-500 animate-pulse"
                )}>
                  {otherUser?.photoURL ? (
                    <img
                      src={otherUser.photoURL}
                      alt={otherUser.displayName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white text-5xl font-bold">
                      {(otherUser?.displayName || "U")[0].toUpperCase()}
                    </div>
                  )}
                </div>
                {callStatus === "connected" && (
                  <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2">
                    <Volume2 className="h-6 w-6 text-green-500 animate-pulse" />
                  </div>
                )}
              </div>

              {/* Name */}
              <h2 className="text-white text-2xl font-semibold mb-2">
                {otherUser?.displayName || "Unknown"}
              </h2>

              {/* Status */}
              <p className="text-white/70 text-lg">{getStatusText()}</p>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-8 left-0 right-0 px-8">
            {/* Incoming Call Controls */}
            {isIncoming && callStatus === "ringing" ? (
              <div className="flex items-center justify-center gap-12">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 text-white"
                  onClick={handleRejectCall}
                >
                  <PhoneOff className="h-8 w-8" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-16 w-16 rounded-full bg-green-500 hover:bg-green-600 text-white"
                  onClick={handleAcceptCall}
                >
                  <Phone className="h-8 w-8" />
                </Button>
              </div>
            ) : (
              /* Active Call Controls */
              <div className="flex items-center justify-center gap-4">
                {/* Mute */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-14 w-14 rounded-full",
                    isMuted ? "bg-red-500 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"
                  )}
                  onClick={handleToggleMute}
                >
                  {isMuted ? (
                    <MicOff className="h-6 w-6 text-white" />
                  ) : (
                    <Mic className="h-6 w-6 text-white" />
                  )}
                </Button>

                {/* Video Toggle (video calls only) */}
                {callType === "video" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-14 w-14 rounded-full",
                      isVideoOff ? "bg-red-500 hover:bg-red-600" : "bg-white/20 hover:bg-white/30"
                    )}
                    onClick={handleToggleVideo}
                  >
                    {isVideoOff ? (
                      <VideoOff className="h-6 w-6 text-white" />
                    ) : (
                      <Video className="h-6 w-6 text-white" />
                    )}
                  </Button>
                )}

                {/* End Call */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600"
                  onClick={handleEndCall}
                >
                  <PhoneOff className="h-8 w-8 text-white" />
                </Button>

                {/* Switch Camera (video calls only) */}
                {callType === "video" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-14 w-14 rounded-full bg-white/20 hover:bg-white/30"
                    onClick={handleSwitchCamera}
                  >
                    <SwitchCamera className="h-6 w-6 text-white" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
