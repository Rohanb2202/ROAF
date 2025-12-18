import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  where,
  deleteDoc,
  type Unsubscribe,
} from "firebase/firestore"
import { db } from "./config"

export interface PollOption {
  id: string
  text: string
  votes: string[] // array of user UIDs who voted
}

export interface Message {
  id?: string
  senderId: string
  type: "text" | "voice" | "image" | "video" | "sticker" | "gif" | "poll" | "drawing"
  encryptedPayload: string
  iv: string
  storageUrl?: string
  thumbnailUrl?: string
  stickerPack?: string
  stickerId?: string
  gifUrl?: string
  mediaWidth?: number
  mediaHeight?: number
  // Poll fields
  pollQuestion?: string
  pollOptions?: PollOption[]
  pollEnded?: boolean
  // Drawing fields
  drawingUrl?: string
  createdAt: any
  status: "sending" | "sent" | "delivered" | "read"
}

export interface Story {
  id?: string
  userId: string
  mediaUrl: string
  mediaType: "image" | "video"
  filter?: string
  createdAt: any
  expiresAt: any
  viewers: string[] // UIDs who viewed
}

export interface LoveNote {
  id?: string
  fromUserId: string
  toUserId: string
  encryptedContent: string
  iv: string
  isSealed: boolean // true until reveal time
  revealAt: any // timestamp when note becomes viewable
  expiresAt: any // timestamp when note is deleted (24hr after reveal)
  createdAt: any
  occasion?: string // birthday, anniversary, etc.
}

export interface Chat {
  id?: string
  chatId: string
  participants: string[]
  createdAt: any
  lastMessage?: string
  lastMessageAt?: any
}

export interface UserProfile {
  uid: string
  email: string
  displayName?: string
  photoURL?: string
  partnerNickname?: string // nickname for partner (only visible to this user)
  chatBackground?: string // background theme for chat
  vaultPinHash?: string // hashed PIN for vault access
  isOnline?: boolean // real-time presence
  lastSeen?: any // timestamp of last activity
  createdAt: any
}

export interface VaultItem {
  id?: string
  chatId: string
  messageId: string
  senderId: string
  type: "image" | "video"
  storageUrl: string
  thumbnailUrl?: string
  mediaWidth?: number
  mediaHeight?: number
  archivedAt: any
  originalCreatedAt: any
}

export async function saveUserProfile(user: { uid: string; email: string; displayName?: string; photoURL?: string }) {
  const userRef = doc(db, "users", user.uid)
  const userDoc = await getDoc(userRef)

  if (!userDoc.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email?.split("@")[0] || "User",
      photoURL: user.photoURL || null,
      createdAt: serverTimestamp(),
    })
  }
}

export async function getAllUsers(currentUid: string): Promise<UserProfile[]> {
  // Get couple UIDs from environment (only these two users can connect)
  const coupleUser1 = process.env.NEXT_PUBLIC_COUPLE_UID_1
  const coupleUser2 = process.env.NEXT_PUBLIC_COUPLE_UID_2

  // If couple UIDs are configured, only show the partner
  if (coupleUser1 && coupleUser2) {
    // Determine partner UID
    const partnerUid = currentUid === coupleUser1 ? coupleUser2 : coupleUser1

    // Check if current user is part of the couple
    if (currentUid !== coupleUser1 && currentUid !== coupleUser2) {
      console.warn("Current user is not part of the configured couple")
      return []
    }

    // Get partner profile
    const partnerProfile = await getUserProfile(partnerUid)
    return partnerProfile ? [partnerProfile] : []
  }

  // Fallback: return all users except current (for development)
  const usersRef = collection(db, "users")
  const q = query(usersRef, where("uid", "!=", currentUid))
  const snapshot = await getDocs(q)

  const users: UserProfile[] = []
  snapshot.forEach((doc) => {
    users.push(doc.data() as UserProfile)
  })

  return users
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, "users", uid)
  const userDoc = await getDoc(userRef)

  if (!userDoc.exists()) return null

  return userDoc.data() as UserProfile
}

export async function getUserChats(currentUid: string): Promise<Chat[]> {
  const chatsRef = collection(db, "chats")
  const q = query(chatsRef, where("participants", "array-contains", currentUid), orderBy("lastMessageAt", "desc"))
  const snapshot = await getDocs(q)

  const chats: Chat[] = []
  snapshot.forEach((doc) => {
    chats.push({ id: doc.id, ...doc.data() } as Chat)
  })

  return chats
}

// Get or create chat between two users
export async function getOrCreateChat(uid1: string, uid2: string): Promise<string> {
  const chatId = [uid1, uid2].sort().join("_")

  const chatRef = doc(db, "chats", chatId)
  const chatDoc = await getDoc(chatRef)

  if (!chatDoc.exists()) {
    await setDoc(chatRef, {
      chatId,
      participants: [uid1, uid2],
      createdAt: serverTimestamp(),
      lastMessageAt: serverTimestamp(),
    })
  }

  return chatId
}

// Send a message
export async function sendMessage(chatId: string, message: Omit<Message, "id" | "createdAt">) {
  const messagesRef = collection(db, "chats", chatId, "messages")
  const docRef = await addDoc(messagesRef, {
    ...message,
    createdAt: serverTimestamp(),
  })

  const chatRef = doc(db, "chats", chatId)
  await updateDoc(chatRef, {
    lastMessageAt: serverTimestamp(),
  })

  return docRef.id
}

// Update message status
export async function updateMessageStatus(chatId: string, messageId: string, status: Message["status"]) {
  const messageRef = doc(db, "chats", chatId, "messages", messageId)
  await updateDoc(messageRef, { status })
}

// Delete a message
export async function deleteMessage(chatId: string, messageId: string) {
  const messageRef = doc(db, "chats", chatId, "messages", messageId)
  await deleteDoc(messageRef)
}

// Listen to messages in real-time
export function subscribeToMessages(chatId: string, callback: (messages: Message[]) => void): Unsubscribe {
  const messagesRef = collection(db, "chats", chatId, "messages")
  const q = query(messagesRef, orderBy("createdAt", "asc"))

  return onSnapshot(q, (snapshot) => {
    const messages: Message[] = []
    snapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message)
    })
    callback(messages)
  })
}

// Get other participant UID
export async function getOtherParticipant(chatId: string, currentUid: string): Promise<string | null> {
  const chatRef = doc(db, "chats", chatId)
  const chatDoc = await getDoc(chatRef)

  if (!chatDoc.exists()) return null

  const participants = chatDoc.data().participants as string[]
  return participants.find((uid) => uid !== currentUid) || null
}

// Mark messages as read
export async function markMessagesAsRead(chatId: string, currentUid: string): Promise<void> {
  try {
    const messagesRef = collection(db, "chats", chatId, "messages")
    const snapshot = await getDocs(messagesRef)

    const updates: Promise<void>[] = []
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data()
      // Only update messages from other user that aren't read yet
      if (
        data.senderId !== currentUid &&
        (data.status === "sent" || data.status === "delivered")
      ) {
        const messageRef = doc(db, "chats", chatId, "messages", docSnapshot.id)
        updates.push(updateDoc(messageRef, { status: "read" }))
      }
    })

    await Promise.all(updates)
  } catch (error) {
    console.error("Failed to mark messages as read:", error)
  }
}

// Update user profile
export async function updateUserProfile(
  uid: string,
  updates: Partial<Pick<UserProfile, "displayName" | "photoURL" | "partnerNickname" | "chatBackground" | "vaultPinHash">>
): Promise<void> {
  const userRef = doc(db, "users", uid)
  await updateDoc(userRef, updates)
}

// Vote on a poll
export async function voteOnPoll(
  chatId: string,
  messageId: string,
  optionId: string,
  currentUid: string
): Promise<void> {
  const messageRef = doc(db, "chats", chatId, "messages", messageId)
  const messageDoc = await getDoc(messageRef)

  if (!messageDoc.exists()) return

  const message = messageDoc.data() as Message
  if (!message.pollOptions) return

  // Remove vote from any other option and add to selected option
  const updatedOptions = message.pollOptions.map(option => ({
    ...option,
    votes: option.id === optionId
      ? option.votes.includes(currentUid)
        ? option.votes.filter(uid => uid !== currentUid) // Remove if already voted
        : [...option.votes, currentUid] // Add vote
      : option.votes.filter(uid => uid !== currentUid) // Remove from other options
  }))

  await updateDoc(messageRef, { pollOptions: updatedOptions })
}

// End a poll
export async function endPoll(chatId: string, messageId: string): Promise<void> {
  const messageRef = doc(db, "chats", chatId, "messages", messageId)
  await updateDoc(messageRef, { pollEnded: true })
}

// ========== STORIES ==========

// Create a story
export async function createStory(story: Omit<Story, "id" | "createdAt" | "expiresAt" | "viewers">): Promise<string> {
  const storiesRef = collection(db, "stories")
  const now = new Date()
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours

  const docRef = await addDoc(storiesRef, {
    ...story,
    viewers: [],
    createdAt: serverTimestamp(),
    expiresAt,
  })

  return docRef.id
}

// Get active stories for all users
export async function getActiveStories(): Promise<Story[]> {
  const storiesRef = collection(db, "stories")
  const now = new Date()
  const q = query(storiesRef, where("expiresAt", ">", now), orderBy("expiresAt", "asc"))
  const snapshot = await getDocs(q)

  const stories: Story[] = []
  snapshot.forEach(doc => {
    stories.push({ id: doc.id, ...doc.data() } as Story)
  })

  return stories
}

// Mark story as viewed
export async function viewStory(storyId: string, viewerUid: string): Promise<void> {
  const storyRef = doc(db, "stories", storyId)
  const storyDoc = await getDoc(storyRef)

  if (!storyDoc.exists()) return

  const story = storyDoc.data() as Story
  if (!story.viewers.includes(viewerUid)) {
    await updateDoc(storyRef, {
      viewers: [...story.viewers, viewerUid]
    })
  }
}

// Delete expired stories (call this periodically)
export async function cleanupExpiredStories(): Promise<void> {
  const storiesRef = collection(db, "stories")
  const now = new Date()
  const q = query(storiesRef, where("expiresAt", "<", now))
  const snapshot = await getDocs(q)

  const deletes: Promise<void>[] = []
  snapshot.forEach(docSnapshot => {
    deletes.push(deleteDoc(doc(db, "stories", docSnapshot.id)))
  })

  await Promise.all(deletes)
}

// Subscribe to stories
export function subscribeToStories(callback: (stories: Story[]) => void): Unsubscribe {
  const storiesRef = collection(db, "stories")
  const now = new Date()
  const q = query(storiesRef, where("expiresAt", ">", now), orderBy("createdAt", "desc"))

  return onSnapshot(q, snapshot => {
    const stories: Story[] = []
    snapshot.forEach(doc => {
      stories.push({ id: doc.id, ...doc.data() } as Story)
    })
    callback(stories)
  })
}

// ========== LOVE NOTES ==========

// Create a love note
export async function createLoveNote(
  fromUserId: string,
  toUserId: string,
  encryptedContent: string,
  iv: string,
  revealAt: Date,
  occasion?: string
): Promise<string> {
  const notesRef = collection(db, "loveNotes")
  const expiresAt = new Date(revealAt.getTime() + 24 * 60 * 60 * 1000) // 24hr after reveal

  const docRef = await addDoc(notesRef, {
    fromUserId,
    toUserId,
    encryptedContent,
    iv,
    isSealed: true,
    revealAt,
    expiresAt,
    createdAt: serverTimestamp(),
    occasion: occasion || null,
  })

  return docRef.id
}

// Get love notes for a user
export async function getLoveNotes(userId: string): Promise<LoveNote[]> {
  const notesRef = collection(db, "loveNotes")
  const now = new Date()

  // Get notes where user is recipient and not expired
  const q = query(
    notesRef,
    where("toUserId", "==", userId),
    where("expiresAt", ">", now)
  )
  const snapshot = await getDocs(q)

  const notes: LoveNote[] = []
  snapshot.forEach(doc => {
    notes.push({ id: doc.id, ...doc.data() } as LoveNote)
  })

  return notes
}

// Unseal notes that are past reveal time
export async function unsealLoveNotes(): Promise<void> {
  const notesRef = collection(db, "loveNotes")
  const now = new Date()

  const q = query(
    notesRef,
    where("isSealed", "==", true),
    where("revealAt", "<=", now)
  )
  const snapshot = await getDocs(q)

  const updates: Promise<void>[] = []
  snapshot.forEach(docSnapshot => {
    updates.push(updateDoc(doc(db, "loveNotes", docSnapshot.id), { isSealed: false }))
  })

  await Promise.all(updates)
}

// Subscribe to love notes for a user
export function subscribeToLoveNotes(userId: string, callback: (notes: LoveNote[]) => void): Unsubscribe {
  const notesRef = collection(db, "loveNotes")
  const now = new Date()

  const q = query(
    notesRef,
    where("toUserId", "==", userId),
    where("expiresAt", ">", now)
  )

  return onSnapshot(q, snapshot => {
    const notes: LoveNote[] = []
    snapshot.forEach(doc => {
      notes.push({ id: doc.id, ...doc.data() } as LoveNote)
    })
    callback(notes)
  })
}

// Delete expired love notes
export async function cleanupExpiredLoveNotes(): Promise<void> {
  const notesRef = collection(db, "loveNotes")
  const now = new Date()
  const q = query(notesRef, where("expiresAt", "<", now))
  const snapshot = await getDocs(q)

  const deletes: Promise<void>[] = []
  snapshot.forEach(docSnapshot => {
    deletes.push(deleteDoc(doc(db, "loveNotes", docSnapshot.id)))
  })

  await Promise.all(deletes)
}

// ========== SECRET VAULT ==========

// Add item to vault
export async function addToVault(
  userId: string,
  item: Omit<VaultItem, "id" | "archivedAt">
): Promise<string> {
  const vaultRef = collection(db, "users", userId, "vault")
  const docRef = await addDoc(vaultRef, {
    ...item,
    archivedAt: serverTimestamp(),
  })
  return docRef.id
}

// Get vault items
export async function getVaultItems(userId: string): Promise<VaultItem[]> {
  const vaultRef = collection(db, "users", userId, "vault")
  const q = query(vaultRef, orderBy("archivedAt", "desc"))
  const snapshot = await getDocs(q)

  const items: VaultItem[] = []
  snapshot.forEach(docSnapshot => {
    items.push({ id: docSnapshot.id, ...docSnapshot.data() } as VaultItem)
  })

  return items
}

// Subscribe to vault items
export function subscribeToVaultItems(
  userId: string,
  callback: (items: VaultItem[]) => void
): Unsubscribe {
  const vaultRef = collection(db, "users", userId, "vault")
  const q = query(vaultRef, orderBy("archivedAt", "desc"))

  return onSnapshot(q, snapshot => {
    const items: VaultItem[] = []
    snapshot.forEach(docSnapshot => {
      items.push({ id: docSnapshot.id, ...docSnapshot.data() } as VaultItem)
    })
    callback(items)
  })
}

// Delete vault item
export async function deleteVaultItem(userId: string, itemId: string): Promise<void> {
  const itemRef = doc(db, "users", userId, "vault", itemId)
  await deleteDoc(itemRef)
}

// Archive media messages older than 24 hours to vault
export async function archiveOldMediaToVault(
  chatId: string,
  userId: string
): Promise<number> {
  const messagesRef = collection(db, "chats", chatId, "messages")
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

  // Get all messages (we'll filter client-side for type)
  const q = query(messagesRef, orderBy("createdAt", "asc"))
  const snapshot = await getDocs(q)

  let archivedCount = 0

  for (const docSnapshot of snapshot.docs) {
    const message = docSnapshot.data() as Message
    const createdAt = message.createdAt?.toDate?.() || new Date(message.createdAt)

    // Only archive images and videos older than 24 hours
    if (
      (message.type === "image" || message.type === "video") &&
      message.storageUrl &&
      createdAt < twentyFourHoursAgo
    ) {
      // Check if already in vault
      const vaultRef = collection(db, "users", userId, "vault")
      const existingQuery = query(vaultRef, where("messageId", "==", docSnapshot.id))
      const existingSnapshot = await getDocs(existingQuery)

      if (existingSnapshot.empty) {
        // Add to vault
        await addToVault(userId, {
          chatId,
          messageId: docSnapshot.id,
          senderId: message.senderId,
          type: message.type as "image" | "video",
          storageUrl: message.storageUrl,
          thumbnailUrl: message.thumbnailUrl,
          mediaWidth: message.mediaWidth,
          mediaHeight: message.mediaHeight,
          originalCreatedAt: message.createdAt,
        })
        archivedCount++
      }
    }
  }

  return archivedCount
}

// Presence functions
export async function updatePresence(userId: string, isOnline: boolean) {
  try {
    const userRef = doc(db, "users", userId)
    await setDoc(userRef, {
      isOnline,
      lastSeen: serverTimestamp(),
    }, { merge: true })
  } catch (error) {
    console.error("Failed to update presence:", error)
  }
}

export function subscribeToUserPresence(
  userId: string,
  callback: (isOnline: boolean, lastSeen: Date | null) => void
): Unsubscribe {
  const userRef = doc(db, "users", userId)
  return onSnapshot(userRef, (docSnapshot) => {
    if (docSnapshot.exists()) {
      const data = docSnapshot.data()
      const lastSeen = data.lastSeen?.toDate ? data.lastSeen.toDate() : null
      callback(data.isOnline || false, lastSeen)
    } else {
      callback(false, null)
    }
  })
}
