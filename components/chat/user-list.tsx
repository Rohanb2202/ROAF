"use client"

import { useEffect, useState } from "react"
import { getAllUsers, getUserChats, type UserProfile, type Chat } from "@/lib/firebase/firestore"
import { useAuth } from "@/lib/context/auth-context"
import { Card } from "@/components/ui/card"
import { ProfileAvatar } from "./profile-avatar"
import { MessageCircle, Heart } from "lucide-react"

interface UserListProps {
  onSelectUser: (uid: string) => void
  partnerNickname?: string
}

export function UserList({ onSelectUser, partnerNickname }: UserListProps) {
  const { user } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [chats, setChats] = useState<Chat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        const [allUsers, userChats] = await Promise.all([getAllUsers(user.uid), getUserChats(user.uid)])
        setUsers(allUsers)
        setChats(userChats)
      } catch (error) {
        console.error("Failed to load users:", error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Get partner (the other user in the couple)
  const partner = users[0]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Heart className="h-4 w-4 text-pink-500" />
          <span>Your Partner</span>
        </div>
      </div>

      {/* Partner Card */}
      <div className="flex-1 overflow-y-auto p-4">
        {!partner ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageCircle className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No partner connected yet</p>
            <p className="text-sm text-muted-foreground mt-1">Ask your partner to sign up</p>
          </div>
        ) : (
          <Card
            className="p-4 cursor-pointer hover:bg-accent transition-colors border-pink-200 dark:border-pink-900"
            onClick={() => onSelectUser(partner.uid)}
          >
            <div className="flex items-center gap-4">
              <ProfileAvatar
                photoURL={partner.photoURL}
                displayName={partnerNickname || partner.displayName}
                email={partner.email}
                size="lg"
                expandable={false}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg truncate">{partnerNickname || partner.displayName}</p>
                <p className="text-sm text-muted-foreground truncate">{partner.email}</p>
                <div className="flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs text-muted-foreground">Tap to chat</span>
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}
