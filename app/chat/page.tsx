"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/context/auth-context"
import {
  getOrCreateChat,
  subscribeToMessages,
  sendMessage,
  deleteMessage,
  getUserProfile,
  getAllUsers,
  markMessagesAsRead,
  voteOnPoll,
  createLoveNote,
  subscribeToLoveNotes,
  unsealLoveNotes,
  createStory,
  subscribeToStories,
  viewStory,
  cleanupExpiredStories,
  archiveOldMediaToVault,
  updatePresence,
  subscribeToUserPresence,
  type Message,
  type UserProfile,
  type PollOption,
  type LoveNote,
  type Story,
} from "@/lib/firebase/firestore"
import { initializeEncryption, encryptMessage, decryptMessage } from "@/lib/crypto/encryption"
import { compressImage, generateVideoThumbnail } from "@/lib/media-compress"
import type { TenorGif } from "@/lib/tenor"
import { MessageBubble } from "@/components/chat/message-bubble"
import { MessageInput } from "@/components/chat/message-input"
import { VoiceMessage } from "@/components/chat/voice-message"
import { MediaMessage } from "@/components/chat/media-message"
import { StickerMessage } from "@/components/chat/sticker-message"
import { GifMessage } from "@/components/chat/gif-message"
import { PollMessage } from "@/components/chat/poll-message"
import { PollCreator } from "@/components/chat/poll-creator"
import { LoveNoteCreator } from "@/components/love-notes/love-note-creator"
import { LoveNoteBox } from "@/components/love-notes/love-note-box"
import { StoryCreator } from "@/components/stories/story-creator"
import { StoryViewer } from "@/components/stories/story-viewer"
import { StoriesBar } from "@/components/stories/stories-bar"
import { CallScreen } from "@/components/call/call-screen"
import { IncomingCall } from "@/components/call/incoming-call"
import { ProfileAvatar } from "@/components/chat/profile-avatar"
import type { FilterType } from "@/lib/image-filters"
import { subscribeToIncomingCalls, CallService, type CallSession, type CallType } from "@/lib/webrtc/call-service"
import { UserList } from "@/components/chat/user-list"
import { SecretVault } from "@/components/vault/secret-vault"
import { Button } from "@/components/ui/button"
import { Settings, Loader2, ArrowLeft, Menu, Heart, Phone, Video, Lock, Instagram } from "lucide-react"
import Image from "next/image"
import { savePendingMessage, getPendingMessages, deletePendingMessage } from "@/lib/storage/indexeddb"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase/config"
import { useSwipe } from "@/hooks/use-swipe"

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [decryptedMessages, setDecryptedMessages] = useState<Map<string, string>>(new Map())
  const [chatId, setChatId] = useState<string | null>(null)
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [encryptionKey, setEncryptionKey] = useState<CryptoKey | null>(null)
  const [isNetworkOnline, setIsNetworkOnline] = useState(true)
  const [partnerOnline, setPartnerOnline] = useState(false)
  const [partnerLastSeen, setPartnerLastSeen] = useState<Date | null>(null)
  const [showUserList, setShowUserList] = useState(true)
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null)
  const [showPollCreator, setShowPollCreator] = useState(false)
  const [showLoveNoteCreator, setShowLoveNoteCreator] = useState(false)
  const [showLoveNoteBox, setShowLoveNoteBox] = useState(false)
  const [loveNotes, setLoveNotes] = useState<LoveNote[]>([])
  const [unreadNotesCount, setUnreadNotesCount] = useState(0)
  const [stories, setStories] = useState<Story[]>([])
  const [allUsers, setAllUsers] = useState<Map<string, UserProfile>>(new Map())
  const [showStoryCreator, setShowStoryCreator] = useState(false)
  const [showStoryViewer, setShowStoryViewer] = useState(false)
  const [storyViewerUserId, setStoryViewerUserId] = useState<string | null>(null)
  const [showCallScreen, setShowCallScreen] = useState(false)
  const [callType, setCallType] = useState<CallType>("voice")
  const [isIncomingCall, setIsIncomingCall] = useState(false)
  const [incomingCall, setIncomingCall] = useState<(CallSession & { id: string }) | null>(null)
  const [currentCallId, setCurrentCallId] = useState<string | null>(null)
  const [showVault, setShowVault] = useState(false)
  const [activeTab, setActiveTab] = useState<"chat" | "instagram">("chat")
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Swipe right from edge to go back to user list (mobile only)
  useSwipe(
    {
      onSwipeRight: () => {
        if (chatId && !showUserList && window.innerWidth < 768) {
          setShowUserList(true)
          setChatId(null)
          setSelectedUser(null)
        }
      },
    },
    { edgeOnly: true, edgeWidth: 40, threshold: 80 }
  )

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login")
    }
  }, [user, authLoading, router])

  useEffect(() => {
    const handleOnline = () => setIsNetworkOnline(true)
    const handleOffline = () => setIsNetworkOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Update own presence
  useEffect(() => {
    if (!user) return

    // Set online when component mounts
    updatePresence(user.uid, true).catch(console.error)

    // Update presence on visibility change
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        updatePresence(user.uid, true).catch(console.error)
      } else {
        updatePresence(user.uid, false).catch(console.error)
      }
    }

    // Periodic heartbeat to keep presence alive
    const heartbeat = setInterval(() => {
      if (document.visibilityState === "visible") {
        updatePresence(user.uid, true).catch(console.error)
      }
    }, 30000) // Every 30 seconds

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Set offline when component unmounts
    return () => {
      updatePresence(user.uid, false).catch(console.error)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      clearInterval(heartbeat)
    }
  }, [user])

  // Subscribe to partner's presence
  useEffect(() => {
    if (!selectedUser) {
      setPartnerOnline(false)
      setPartnerLastSeen(null)
      return
    }

    const unsubscribe = subscribeToUserPresence(selectedUser.uid, (isOnline, lastSeen) => {
      setPartnerOnline(isOnline)
      setPartnerLastSeen(lastSeen)
    })

    return () => unsubscribe()
  }, [selectedUser])

  useEffect(() => {
    const initEncryption = async () => {
      const key = await initializeEncryption()
      setEncryptionKey(key)
    }
    initEncryption()
  }, [])

  // Subscribe to love notes
  useEffect(() => {
    if (!user) return

    // Unseal notes that are past their reveal time
    unsealLoveNotes().catch(console.error)

    const unsubscribe = subscribeToLoveNotes(user.uid, (notes) => {
      setLoveNotes(notes)
      // Count revealed but unread notes
      const unread = notes.filter(n => !n.isSealed).length
      setUnreadNotesCount(unread)
    })

    // Check for unsealed notes periodically
    const interval = setInterval(() => {
      unsealLoveNotes().catch(console.error)
    }, 60000) // Check every minute

    return () => {
      unsubscribe()
      clearInterval(interval)
    }
  }, [user])

  // Load all users and subscribe to stories
  useEffect(() => {
    if (!user) return

    // Load all users and auto-select partner
    const loadUsers = async () => {
      const users = await getAllUsers(user.uid)
      const userMap = new Map<string, UserProfile>()
      users.forEach(u => userMap.set(u.uid, u))

      // Load current user profile (for settings like nickname and background)
      const currentProfile = await getUserProfile(user.uid)
      if (currentProfile) {
        userMap.set(user.uid, currentProfile)
        setCurrentUserProfile(currentProfile)
      }
      setAllUsers(userMap)

      // Auto-select the partner (the first other user) if not already selected
      if (!selectedUser && users.length > 0) {
        const partner = users[0]
        handleSelectUser(partner.uid)
      }
    }

    loadUsers()

    // Subscribe to stories
    const unsubscribe = subscribeToStories((fetchedStories) => {
      setStories(fetchedStories)
    })

    // Cleanup expired stories periodically
    cleanupExpiredStories().catch(console.error)
    const cleanupInterval = setInterval(() => {
      cleanupExpiredStories().catch(console.error)
    }, 60000)

    return () => {
      unsubscribe()
      clearInterval(cleanupInterval)
    }
  }, [user])

  // Subscribe to incoming calls
  useEffect(() => {
    if (!user) return

    const unsubscribe = subscribeToIncomingCalls(user.uid, (call) => {
      // Don't show if already in a call
      if (!showCallScreen && !incomingCall) {
        setIncomingCall(call)
      }
    })

    return () => unsubscribe()
  }, [user, showCallScreen, incomingCall])

  const handleSelectUser = async (otherUid: string) => {
    if (!user) return

    setLoading(true)
    try {
      // Get user profile
      const profile = await getUserProfile(otherUid)
      setSelectedUser(profile)

      // Create or get chat
      const id = await getOrCreateChat(user.uid, otherUid)
      setChatId(id)

      // Subscribe to messages
      const unsubscribe = subscribeToMessages(id, (msgs) => {
        setMessages(msgs)
      })

      // Try to send pending offline messages
      if (isNetworkOnline) {
        const pending = await getPendingMessages()
        for (const pm of pending) {
          try {
            await sendMessage(pm.chatId, pm.message)
            await deletePendingMessage(pm.id!)
          } catch (error) {
            console.error("Failed to send pending message:", error)
          }
        }
      }

      setShowUserList(false)

      return () => unsubscribe()
    } catch (error) {
      console.error("Failed to start chat:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!messages || !encryptionKey) return

    const decryptAll = async () => {
      const newDecrypted = new Map(decryptedMessages)

      for (const msg of messages) {
        if (!newDecrypted.has(msg.id!)) {
          try {
            const decrypted = await decryptMessage(
              {
                encryptedPayload: msg.encryptedPayload,
                iv: msg.iv,
              },
              encryptionKey,
            )
            newDecrypted.set(msg.id!, decrypted)
          } catch (error) {
            console.error("Failed to decrypt message:", error)
            newDecrypted.set(msg.id!, "[Failed to decrypt]")
          }
        }
      }

      setDecryptedMessages(newDecrypted)
    }

    decryptAll()
  }, [messages, encryptionKey])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // Auto-archive media older than 24 hours to vault
  useEffect(() => {
    if (!chatId || !user) return

    const archiveMedia = async () => {
      try {
        const archivedCount = await archiveOldMediaToVault(chatId, user.uid)
        if (archivedCount > 0) {
          console.log(`Archived ${archivedCount} media items to vault`)
        }
      } catch (error) {
        console.error("Failed to archive media to vault:", error)
      }
    }

    // Run archive check on mount and periodically
    archiveMedia()
    const interval = setInterval(archiveMedia, 60 * 60 * 1000) // Check every hour

    return () => clearInterval(interval)
  }, [chatId, user])

  const handleSendMessage = async (content: string) => {
    if (!chatId || !user || !encryptionKey) return

    try {
      const encrypted = await encryptMessage(content, encryptionKey)

      const message = {
        senderId: user.uid,
        type: "text" as const,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        status: "sent" as const,
      }

      if (isNetworkOnline) {
        await sendMessage(chatId, message)
      } else {
        await savePendingMessage(chatId, message)
        setMessages((prev) => [
          ...prev,
          {
            ...message,
            id: `temp_${Date.now()}`,
            createdAt: new Date(),
            status: "sending",
          },
        ])
      }
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  const handleSendVoiceMessage = async (audioBlob: Blob) => {
    if (!chatId || !user || !encryptionKey) return

    try {
      // Upload audio to storage (don't encrypt the audio data - it's too large)
      const filename = `voice_${Date.now()}.webm`
      const storageRef = ref(storage, `chats/${chatId}/voice/${filename}`)
      await uploadBytes(storageRef, audioBlob)
      const url = await getDownloadURL(storageRef)

      // Encrypt just a placeholder (like we do with images)
      const encrypted = await encryptMessage("voice", encryptionKey)

      const message = {
        senderId: user.uid,
        type: "voice" as const,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        storageUrl: url,
        status: "sent" as const,
      }

      await sendMessage(chatId, message)
    } catch (error) {
      console.error("Failed to send voice message:", error)
    }
  }

  const handleSendImage = async (file: File) => {
    if (!chatId || !user || !encryptionKey) return

    try {
      // Compress the image
      const compressed = await compressImage(file)

      // Upload to Firebase Storage
      const filename = `image_${Date.now()}.webp`
      const storageRef = ref(storage, `chats/${chatId}/media/${filename}`)
      await uploadBytes(storageRef, compressed.blob)
      const url = await getDownloadURL(storageRef)

      // Encrypt a placeholder (actual image is in storage)
      const encrypted = await encryptMessage("image", encryptionKey)

      const message = {
        senderId: user.uid,
        type: "image" as const,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        storageUrl: url,
        mediaWidth: compressed.width,
        mediaHeight: compressed.height,
        status: "sent" as const,
      }

      await sendMessage(chatId, message)
    } catch (error) {
      console.error("Failed to send image:", error)
    }
  }

  const handleSendVideo = async (file: File) => {
    if (!chatId || !user || !encryptionKey) return

    try {
      // Generate thumbnail
      const thumbnail = await generateVideoThumbnail(file)

      // Upload video
      const videoFilename = `video_${Date.now()}.${file.name.split('.').pop()}`
      const videoRef = ref(storage, `chats/${chatId}/media/${videoFilename}`)
      await uploadBytes(videoRef, file)
      const videoUrl = await getDownloadURL(videoRef)

      // Upload thumbnail
      const thumbFilename = `thumb_${Date.now()}.webp`
      const thumbRef = ref(storage, `chats/${chatId}/media/${thumbFilename}`)
      await uploadBytes(thumbRef, thumbnail.blob)
      const thumbUrl = await getDownloadURL(thumbRef)

      // Encrypt a placeholder
      const encrypted = await encryptMessage("video", encryptionKey)

      const message = {
        senderId: user.uid,
        type: "video" as const,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        storageUrl: videoUrl,
        thumbnailUrl: thumbUrl,
        mediaWidth: thumbnail.width,
        mediaHeight: thumbnail.height,
        status: "sent" as const,
      }

      await sendMessage(chatId, message)
    } catch (error) {
      console.error("Failed to send video:", error)
    }
  }

  const handleSendSticker = async (pack: string, id: string) => {
    if (!chatId || !user || !encryptionKey) return

    try {
      // Encrypt the sticker info
      const encrypted = await encryptMessage(`sticker:${pack}:${id}`, encryptionKey)

      const message = {
        senderId: user.uid,
        type: "sticker" as const,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        stickerPack: pack,
        stickerId: id,
        status: "sent" as const,
      }

      await sendMessage(chatId, message)
    } catch (error) {
      console.error("Failed to send sticker:", error)
    }
  }

  const handleSendGif = async (gif: TenorGif) => {
    if (!chatId || !user || !encryptionKey) return

    try {
      // Encrypt the GIF URL
      const encrypted = await encryptMessage(gif.url, encryptionKey)

      const message = {
        senderId: user.uid,
        type: "gif" as const,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        gifUrl: gif.url,
        mediaWidth: gif.width,
        mediaHeight: gif.height,
        status: "sent" as const,
      }

      await sendMessage(chatId, message)
    } catch (error) {
      console.error("Failed to send GIF:", error)
    }
  }

  const handleCreatePoll = async (question: string, options: string[]) => {
    if (!chatId || !user || !encryptionKey) return

    try {
      const encrypted = await encryptMessage(question, encryptionKey)

      const pollOptions: PollOption[] = options.map((text, index) => ({
        id: `opt_${index}_${Date.now()}`,
        text,
        votes: [],
      }))

      const message = {
        senderId: user.uid,
        type: "poll" as const,
        encryptedPayload: encrypted.encryptedPayload,
        iv: encrypted.iv,
        pollQuestion: question,
        pollOptions,
        pollEnded: false,
        status: "sent" as const,
      }

      await sendMessage(chatId, message)
      setShowPollCreator(false)
    } catch (error) {
      console.error("Failed to create poll:", error)
    }
  }

  const handleVotePoll = async (messageId: string, optionId: string) => {
    if (!chatId || !user) return

    try {
      await voteOnPoll(chatId, messageId, optionId, user.uid)
    } catch (error) {
      console.error("Failed to vote:", error)
    }
  }

  const handleDeleteMessage = async (messageId: string) => {
    if (!chatId) return

    try {
      await deleteMessage(chatId, messageId)
      // Also remove from decrypted messages cache
      setDecryptedMessages((prev) => {
        const newMap = new Map(prev)
        newMap.delete(messageId)
        return newMap
      })
    } catch (error) {
      console.error("Failed to delete message:", error)
    }
  }

  const handleCreateLoveNote = async (content: string, revealAt: Date, occasion?: string) => {
    if (!user || !selectedUser || !encryptionKey) return

    try {
      const encrypted = await encryptMessage(content, encryptionKey)

      await createLoveNote(
        user.uid,
        selectedUser.uid,
        encrypted.encryptedPayload,
        encrypted.iv,
        revealAt,
        occasion
      )

      setShowLoveNoteCreator(false)
    } catch (error) {
      console.error("Failed to create love note:", error)
    }
  }

  const handleDecryptLoveNote = async (note: LoveNote): Promise<string> => {
    if (!encryptionKey) return "Unable to decrypt"

    try {
      return await decryptMessage(
        { encryptedPayload: note.encryptedContent, iv: note.iv },
        encryptionKey
      )
    } catch (error) {
      console.error("Failed to decrypt love note:", error)
      return "Failed to decrypt note"
    }
  }

  const handleCreateStory = async (imageDataUrl: string, filter: FilterType) => {
    if (!user) return

    try {
      // Convert data URL to blob and upload
      const response = await fetch(imageDataUrl)
      const blob = await response.blob()

      const filename = `story_${Date.now()}.jpg`
      const storageRef = ref(storage, `stories/${user.uid}/${filename}`)
      await uploadBytes(storageRef, blob)
      const url = await getDownloadURL(storageRef)

      await createStory({
        userId: user.uid,
        mediaUrl: url,
        mediaType: "image",
        filter: filter,
      })

      setShowStoryCreator(false)
    } catch (error) {
      console.error("Failed to create story:", error)
    }
  }

  const handleViewStory = (userId: string) => {
    setStoryViewerUserId(userId)
    setShowStoryViewer(true)
  }

  const handleStoryViewed = async (storyId: string) => {
    if (!user) return
    try {
      await viewStory(storyId, user.uid)
    } catch (error) {
      console.error("Failed to mark story as viewed:", error)
    }
  }

  // Get stories for viewer - filter by selected user
  const getStoriesForViewer = () => {
    if (!storyViewerUserId) return stories
    return stories.filter(s => s.userId === storyViewerUserId)
  }

  // Call handlers
  const handleStartCall = (type: CallType) => {
    if (!selectedUser) return
    setCallType(type)
    setIsIncomingCall(false)
    setCurrentCallId(null)
    setShowCallScreen(true)
  }

  const [autoAnswerCall, setAutoAnswerCall] = useState(false)

  const handleAcceptIncomingCall = () => {
    if (!incomingCall) return
    setCallType(incomingCall.type)
    setIsIncomingCall(true)
    setCurrentCallId(incomingCall.id)
    setAutoAnswerCall(true) // Auto-answer since user already accepted
    setShowCallScreen(true)
    setIncomingCall(null)
  }

  const handleRejectIncomingCall = async () => {
    if (!incomingCall || !user) return
    try {
      // Create a temporary CallService instance to reject the call
      const tempCallService = new CallService(user.uid)
      await tempCallService.rejectCall(incomingCall.id)
      tempCallService.destroy()
    } catch (error) {
      console.error("Failed to reject call:", error)
    }
    setIncomingCall(null)
  }

  const handleCallEnd = () => {
    setShowCallScreen(false)
    setCurrentCallId(null)
    setIsIncomingCall(false)
    setAutoAnswerCall(false)
  }

  // Mark messages as read when viewing
  useEffect(() => {
    if (!chatId || !user || !messages.length) return

    const unreadMessages = messages.filter(
      (msg) => msg.senderId !== user.uid && (msg.status === "sent" || msg.status === "delivered")
    )

    if (unreadMessages.length > 0) {
      markMessagesAsRead(chatId, user.uid).catch(console.error)
    }
  }, [chatId, user, messages])

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Get chat background class based on user preference
  const getChatBackgroundClass = () => {
    const backgrounds: Record<string, string> = {
      "default": "bg-background",
      "gradient-love": "bg-gradient-to-br from-pink-100 via-red-50 to-rose-100 dark:from-pink-950 dark:via-red-950 dark:to-rose-950",
      "gradient-ocean": "bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 dark:from-blue-950 dark:via-cyan-950 dark:to-teal-950",
      "gradient-sunset": "bg-gradient-to-br from-orange-100 via-pink-50 to-purple-100 dark:from-orange-950 dark:via-pink-950 dark:to-purple-950",
      "gradient-forest": "bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950",
      "gradient-lavender": "bg-gradient-to-br from-purple-100 via-violet-50 to-indigo-100 dark:from-purple-950 dark:via-violet-950 dark:to-indigo-950",
    }
    return backgrounds[currentUserProfile?.chatBackground || "default"] || backgrounds.default
  }

  // Get display name for partner (use nickname if set)
  const getPartnerDisplayName = () => {
    if (currentUserProfile?.partnerNickname) {
      return currentUserProfile.partnerNickname
    }
    return selectedUser?.displayName || "Partner"
  }

  // Format last seen timestamp
  const formatLastSeen = (date: Date) => {
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return "yesterday"
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="flex h-[100dvh] bg-background overflow-hidden">
      {/* User List Sidebar */}
      <div className={`${showUserList ? "flex" : "hidden"} md:flex flex-col w-full md:w-80 border-r bg-card h-[100dvh]`}>
        <div className="flex items-center justify-between p-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="ROAF" width={28} height={28} className="object-contain" />
            <img src="/title_logo.png" alt="ROAF" className="h-10 w-auto object-contain" />
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={() => setShowVault(true)} title="Secret Vault">
              <Lock className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => router.push("/settings")}>
              <Settings className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Tabs: Chat / Instagram */}
        <div className="flex border-b shrink-0">
          <button
            onClick={() => setActiveTab("chat")}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === "chat"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Heart className="h-4 w-4" />
            Chat
          </button>
          <button
            onClick={() => setActiveTab("instagram")}
            className={`flex-1 py-3 px-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors ${
              activeTab === "instagram"
                ? "text-primary border-b-2 border-primary bg-primary/5"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Instagram className="h-4 w-4" />
            Instagram
          </button>
        </div>

        {activeTab === "chat" ? (
          <>
            {/* Stories Bar in Sidebar */}
            {user && (
              <StoriesBar
                stories={stories}
                users={allUsers}
                currentUserId={user.uid}
                partnerNickname={currentUserProfile?.partnerNickname}
                onAddStory={() => setShowStoryCreator(true)}
                onViewStory={handleViewStory}
              />
            )}
            <div className="flex-1 overflow-hidden">
              <UserList onSelectUser={handleSelectUser} partnerNickname={currentUserProfile?.partnerNickname} />
            </div>
          </>
        ) : (
          /* Instagram Tab Content */
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 flex items-center justify-center mb-4">
              <Instagram className="h-10 w-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Open Instagram</h3>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Browse your feed, post stories, send DMs, and stay connected with your partner on Instagram.
            </p>
            <Button
              size="lg"
              className="gap-2 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 hover:opacity-90"
              onClick={() => window.open("https://www.instagram.com", "_blank", "noopener,noreferrer")}
            >
              <Instagram className="h-5 w-5" />
              Open Instagram
            </Button>
            <p className="text-xs text-muted-foreground mt-4">
              Opens in a new tab
            </p>
          </div>
        )}
      </div>

      {/* Chat Area */}
      <div className={`${showUserList ? "hidden" : "flex"} md:flex flex-col flex-1 h-[100dvh] md:h-screen overflow-hidden`}>
        {!chatId ? (
          <div className="flex flex-col items-center justify-center h-full p-8 text-center">
            <img src="/logo.png" alt="ROAF" className="w-20 h-20 object-contain mb-2" />
            <img src="/title_logo.png" alt="ROAF - Connecting 2 Souls" className="h-14 w-auto object-contain mb-4" />
            <p className="text-muted-foreground max-w-md">
              Select your partner to start chatting
            </p>
            <Button onClick={() => setShowUserList(true)} className="mt-4 md:hidden">
              <Menu className="h-4 w-4 mr-2" />
              Show Partner
            </Button>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <header className="bg-card border-b px-2 sm:px-4 py-2 flex items-center gap-2 shadow-sm shrink-0 sticky top-0 z-10 min-h-[56px]">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden shrink-0 h-9 w-9"
                onClick={() => {
                  setShowUserList(true)
                  setChatId(null)
                  setSelectedUser(null)
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>

              <ProfileAvatar
                photoURL={selectedUser?.photoURL}
                displayName={selectedUser?.displayName}
                email={selectedUser?.email}
                size="sm"
                expandable={true}
              />

              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-sm truncate">{getPartnerDisplayName()}</h2>
                <p className="text-xs text-muted-foreground">
                  {partnerOnline ? (
                    <span className="text-green-500">Online</span>
                  ) : partnerLastSeen ? (
                    `Last seen ${formatLastSeen(partnerLastSeen)}`
                  ) : (
                    "Offline"
                  )}
                </p>
              </div>

              {/* Action buttons - compact on mobile */}
              <div className="flex items-center gap-0.5 sm:gap-1">
                {/* Love Notes Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setShowLoveNoteBox(true)}
                >
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5 text-pink-500" />
                  {unreadNotesCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-pink-500 text-white text-[10px] rounded-full flex items-center justify-center">
                      {unreadNotesCount}
                    </span>
                  )}
                </Button>

                {/* Write Love Note Button - hidden on very small screens */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => setShowLoveNoteCreator(true)}
                  title="Write a love note"
                >
                  <Heart className="h-4 w-4 sm:h-5 sm:w-5" fill="currentColor" />
                </Button>

                {/* Voice Call Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => handleStartCall("voice")}
                  title="Voice call"
                >
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                {/* Video Call Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 sm:h-9 sm:w-9"
                  onClick={() => handleStartCall("video")}
                  title="Video call"
                >
                  <Video className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>

                <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-9 sm:w-9" onClick={() => router.push("/settings")}>
                  <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </div>
            </header>

            {/* Messages */}
            <div className={`flex-1 overflow-y-auto overflow-x-hidden p-4 pb-4 space-y-2 ${getChatBackgroundClass()}`}>
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <>
                  {messages.map((msg) => {
                    const isSent = msg.senderId === user?.uid

                    if (msg.type === "voice") {
                      return (
                        <div key={msg.id} className={`flex w-full ${isSent ? "justify-end" : "justify-start"}`}>
                          <VoiceMessage audioUrl={msg.storageUrl!} isSent={isSent} messageId={msg.id} onDelete={handleDeleteMessage} />
                        </div>
                      )
                    }

                    if (msg.type === "image" || msg.type === "video") {
                      return <MediaMessage key={msg.id} message={msg} isSent={isSent} onDelete={handleDeleteMessage} />
                    }

                    if (msg.type === "sticker") {
                      return <StickerMessage key={msg.id} message={msg} isSent={isSent} onDelete={handleDeleteMessage} />
                    }

                    if (msg.type === "gif") {
                      return <GifMessage key={msg.id} message={msg} isSent={isSent} onDelete={handleDeleteMessage} />
                    }

                    if (msg.type === "poll") {
                      return (
                        <PollMessage
                          key={msg.id}
                          message={msg}
                          isSent={isSent}
                          currentUserId={user?.uid || ""}
                          onVote={(optionId) => handleVotePoll(msg.id!, optionId)}
                          onDelete={handleDeleteMessage}
                        />
                      )
                    }

                    const decryptedContent = decryptedMessages.get(msg.id!) || "Decrypting..."

                    return (
                      <MessageBubble key={msg.id} message={msg} decryptedContent={decryptedContent} isSent={isSent} onDelete={handleDeleteMessage} />
                    )
                  })}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div className="shrink-0 bg-background border-t sticky bottom-0 z-10">
              <MessageInput
                onSendMessage={handleSendMessage}
                onSendVoiceMessage={handleSendVoiceMessage}
                onImageSelect={handleSendImage}
                onVideoSelect={handleSendVideo}
                onStickerSelect={handleSendSticker}
                onGifSelect={handleSendGif}
                onPollCreate={() => setShowPollCreator(true)}
                disabled={!isNetworkOnline}
              />
            </div>

            {/* Poll Creator Dialog */}
            <PollCreator
              open={showPollCreator}
              onOpenChange={setShowPollCreator}
              onCreatePoll={handleCreatePoll}
            />

            {/* Love Note Creator */}
            <LoveNoteCreator
              open={showLoveNoteCreator}
              onOpenChange={setShowLoveNoteCreator}
              onCreateNote={handleCreateLoveNote}
            />

            {/* Love Note Box */}
            <LoveNoteBox
              open={showLoveNoteBox}
              onOpenChange={setShowLoveNoteBox}
              notes={loveNotes}
              onNoteRead={(noteId) => {
                // Mark as read - just update local count for now
                setUnreadNotesCount(prev => Math.max(0, prev - 1))
              }}
              decryptNote={handleDecryptLoveNote}
            />
          </>
        )}
      </div>

      {/* Story Creator */}
      <StoryCreator
        open={showStoryCreator}
        onOpenChange={setShowStoryCreator}
        onCreateStory={handleCreateStory}
      />

      {/* Story Viewer */}
      <StoryViewer
        open={showStoryViewer}
        onOpenChange={setShowStoryViewer}
        stories={getStoriesForViewer()}
        users={allUsers}
        currentUserId={user?.uid || ""}
        onStoryViewed={handleStoryViewed}
      />

      {/* Call Screen */}
      {showCallScreen && user && (
        <CallScreen
          open={showCallScreen}
          onOpenChange={setShowCallScreen}
          callType={callType}
          isIncoming={isIncomingCall}
          autoAnswer={autoAnswerCall}
          callId={currentCallId || undefined}
          currentUserId={user.uid}
          otherUser={selectedUser}
          onCallEnd={handleCallEnd}
        />
      )}

      {/* Incoming Call */}
      {incomingCall && (
        <IncomingCall
          call={incomingCall}
          caller={allUsers.get(incomingCall.callerId) || null}
          onAccept={handleAcceptIncomingCall}
          onReject={handleRejectIncomingCall}
        />
      )}

      {/* Secret Vault */}
      {user && (
        <SecretVault
          open={showVault}
          onOpenChange={setShowVault}
          userId={user.uid}
        />
      )}
    </div>
  )
}
