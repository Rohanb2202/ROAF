// WebRTC Call Service
// Uses Firebase Firestore for signaling

import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "@/lib/firebase/config"

export type CallType = "voice" | "video"
export type CallStatus = "calling" | "ringing" | "connected" | "ended" | "rejected" | "missed"

export interface CallSession {
  id?: string
  callerId: string
  calleeId: string
  type: CallType
  status: CallStatus
  offer?: RTCSessionDescriptionInit
  answer?: RTCSessionDescriptionInit
  createdAt: any
  endedAt?: any
}

export interface IceCandidate {
  id?: string
  candidate: RTCIceCandidateInit
  sender: string
  createdAt: any
}

// Free STUN servers
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
}

export class CallService {
  private peerConnection: RTCPeerConnection | null = null
  private localStream: MediaStream | null = null
  private remoteStream: MediaStream | null = null
  private currentCallId: string | null = null
  private currentUserId: string
  private iceCandidatesUnsubscribe: Unsubscribe | null = null
  private callUnsubscribe: Unsubscribe | null = null

  public onLocalStream: ((stream: MediaStream) => void) | null = null
  public onRemoteStream: ((stream: MediaStream) => void) | null = null
  public onCallStatusChange: ((status: CallStatus) => void) | null = null
  public onCallEnded: (() => void) | null = null

  constructor(userId: string) {
    this.currentUserId = userId
  }

  // Initialize peer connection
  private initializePeerConnection() {
    this.peerConnection = new RTCPeerConnection(ICE_SERVERS)

    // Handle ICE candidates
    this.peerConnection.onicecandidate = async (event) => {
      if (event.candidate && this.currentCallId) {
        await this.sendIceCandidate(event.candidate)
      }
    }

    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0]
        this.onRemoteStream?.(this.remoteStream)
      }
    }

    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection?.connectionState
      if (state === "connected") {
        this.onCallStatusChange?.("connected")
      } else if (state === "disconnected" || state === "failed" || state === "closed") {
        this.endCall()
      }
    }

    return this.peerConnection
  }

  // Get local media stream
  private async getLocalStream(type: CallType): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === "video" ? { facingMode: "user", width: 640, height: 480 } : false,
    }

    this.localStream = await navigator.mediaDevices.getUserMedia(constraints)
    this.onLocalStream?.(this.localStream)

    return this.localStream
  }

  // Start a call (caller)
  async startCall(calleeId: string, type: CallType): Promise<string> {
    try {
      // Get local stream
      const stream = await this.getLocalStream(type)

      // Initialize peer connection
      const pc = this.initializePeerConnection()

      // Add tracks to peer connection
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Create call document in Firestore
      const callRef = doc(collection(db, "calls"))
      this.currentCallId = callRef.id

      const callSession: Omit<CallSession, "id"> = {
        callerId: this.currentUserId,
        calleeId: calleeId,
        type: type,
        status: "calling",
        offer: {
          type: offer.type,
          sdp: offer.sdp,
        },
        createdAt: serverTimestamp(),
      }

      await setDoc(callRef, callSession)

      // Listen for answer and call status changes
      this.subscribeToCall(this.currentCallId)
      this.subscribeToIceCandidates(this.currentCallId)

      return this.currentCallId
    } catch (error) {
      console.error("Failed to start call:", error)
      throw error
    }
  }

  // Answer a call (callee)
  async answerCall(callId: string): Promise<void> {
    try {
      this.currentCallId = callId

      // Get call details
      const callRef = doc(db, "calls", callId)
      const callDoc = await getDoc(callRef)

      if (!callDoc.exists()) {
        throw new Error("Call not found")
      }

      const callData = callDoc.data() as CallSession

      // Get local stream
      const stream = await this.getLocalStream(callData.type)

      // Initialize peer connection
      const pc = this.initializePeerConnection()

      // Add tracks
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream)
      })

      // Set remote description (offer)
      if (callData.offer) {
        await pc.setRemoteDescription(new RTCSessionDescription(callData.offer))
      }

      // Create answer
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)

      // Update call with answer
      await updateDoc(callRef, {
        answer: {
          type: answer.type,
          sdp: answer.sdp,
        },
        status: "connected",
      })

      // Subscribe to ICE candidates
      this.subscribeToIceCandidates(callId)
      this.subscribeToCall(callId)
    } catch (error) {
      console.error("Failed to answer call:", error)
      throw error
    }
  }

  // Reject a call
  async rejectCall(callId: string): Promise<void> {
    try {
      const callRef = doc(db, "calls", callId)
      await updateDoc(callRef, {
        status: "rejected",
        endedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error("Failed to reject call:", error)
    }
  }

  // End the current call
  async endCall(): Promise<void> {
    try {
      // Update call status
      if (this.currentCallId) {
        const callRef = doc(db, "calls", this.currentCallId)
        const callDoc = await getDoc(callRef)

        if (callDoc.exists()) {
          await updateDoc(callRef, {
            status: "ended",
            endedAt: serverTimestamp(),
          })
        }
      }
    } catch (error) {
      console.error("Failed to update call status:", error)
    } finally {
      this.cleanup()
      this.onCallEnded?.()
    }
  }

  // Subscribe to call document changes
  private subscribeToCall(callId: string) {
    const callRef = doc(db, "calls", callId)

    this.callUnsubscribe = onSnapshot(callRef, async (snapshot) => {
      if (!snapshot.exists()) return

      const callData = snapshot.data() as CallSession

      // Handle answer (for caller)
      if (callData.answer && this.peerConnection?.currentRemoteDescription === null) {
        await this.peerConnection?.setRemoteDescription(
          new RTCSessionDescription(callData.answer)
        )
      }

      // Handle status changes
      this.onCallStatusChange?.(callData.status)

      if (callData.status === "ended" || callData.status === "rejected") {
        this.cleanup()
        this.onCallEnded?.()
      }
    })
  }

  // Subscribe to ICE candidates
  private subscribeToIceCandidates(callId: string) {
    const candidatesRef = collection(db, "calls", callId, "candidates")
    const q = query(candidatesRef, orderBy("createdAt", "asc"))

    this.iceCandidatesUnsubscribe = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        if (change.type === "added") {
          const data = change.doc.data() as IceCandidate

          // Only process candidates from the other party
          if (data.sender !== this.currentUserId && this.peerConnection) {
            try {
              await this.peerConnection.addIceCandidate(
                new RTCIceCandidate(data.candidate)
              )
            } catch (error) {
              console.error("Failed to add ICE candidate:", error)
            }
          }
        }
      })
    })
  }

  // Send ICE candidate
  private async sendIceCandidate(candidate: RTCIceCandidate): Promise<void> {
    if (!this.currentCallId) return

    const candidatesRef = collection(db, "calls", this.currentCallId, "candidates")

    await addDoc(candidatesRef, {
      candidate: candidate.toJSON(),
      sender: this.currentUserId,
      createdAt: serverTimestamp(),
    })
  }

  // Toggle mute
  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled
        return !audioTrack.enabled // Return true if muted
      }
    }
    return false
  }

  // Toggle video
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled
        return !videoTrack.enabled // Return true if video off
      }
    }
    return false
  }

  // Switch camera
  async switchCamera(): Promise<void> {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0]
      if (videoTrack) {
        // Get current facing mode
        const settings = videoTrack.getSettings()
        const newFacingMode = settings.facingMode === "user" ? "environment" : "user"

        // Get new stream with different camera
        const newStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: newFacingMode },
          audio: false,
        })

        const newVideoTrack = newStream.getVideoTracks()[0]

        // Replace track in peer connection
        const sender = this.peerConnection
          ?.getSenders()
          .find((s) => s.track?.kind === "video")

        if (sender) {
          await sender.replaceTrack(newVideoTrack)
        }

        // Replace in local stream
        this.localStream.removeTrack(videoTrack)
        videoTrack.stop()
        this.localStream.addTrack(newVideoTrack)

        this.onLocalStream?.(this.localStream)
      }
    }
  }

  // Cleanup resources
  private cleanup() {
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop())
      this.localStream = null
    }

    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close()
      this.peerConnection = null
    }

    // Unsubscribe from listeners
    this.iceCandidatesUnsubscribe?.()
    this.callUnsubscribe?.()

    this.remoteStream = null
    this.currentCallId = null
  }

  // Destroy the service
  destroy() {
    this.cleanup()
  }
}

// Listen for incoming calls
export function subscribeToIncomingCalls(
  userId: string,
  callback: (call: CallSession & { id: string }) => void
): Unsubscribe {
  const callsRef = collection(db, "calls")
  const q = query(callsRef, orderBy("createdAt", "desc"))

  return onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
      if (change.type === "added") {
        const callData = change.doc.data() as CallSession
        // Check if this is an incoming call for this user
        if (callData.calleeId === userId && callData.status === "calling") {
          callback({ ...callData, id: change.doc.id })
        }
      }
    })
  })
}
