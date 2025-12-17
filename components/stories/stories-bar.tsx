"use client"

import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Story, UserProfile } from "@/lib/firebase/firestore"

interface StoriesBarProps {
  stories: Story[]
  users: Map<string, UserProfile>
  currentUserId: string
  partnerNickname?: string
  onAddStory: () => void
  onViewStory: (userId: string) => void
}

export function StoriesBar({
  stories,
  users,
  currentUserId,
  partnerNickname,
  onAddStory,
  onViewStory,
}: StoriesBarProps) {
  // Group stories by user
  const storiesByUser = new Map<string, Story[]>()

  stories.forEach(story => {
    const existing = storiesByUser.get(story.userId) || []
    storiesByUser.set(story.userId, [...existing, story])
  })

  // Get current user's stories
  const myStories = storiesByUser.get(currentUserId) || []

  // Get other users with stories
  const otherUserIds = Array.from(storiesByUser.keys()).filter(id => id !== currentUserId)

  // Check if user has viewed all their stories
  const hasViewedAllStories = (userId: string) => {
    const userStories = storiesByUser.get(userId) || []
    return userStories.every(story => story.viewers.includes(currentUserId))
  }

  return (
    <div className="flex gap-4 p-4 overflow-x-auto scrollbar-hide border-b bg-card">
      {/* Add Story / My Story */}
      <div className="flex flex-col items-center gap-1 shrink-0">
        <div className="relative">
          <button
            onClick={myStories.length > 0 ? () => onViewStory(currentUserId) : onAddStory}
            className={cn(
              "w-16 h-16 rounded-full p-0.5",
              myStories.length > 0
                ? "bg-gradient-to-br from-pink-500 via-red-500 to-orange-500"
                : "bg-muted"
            )}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-background">
              {users.get(currentUserId)?.photoURL ? (
                <img
                  src={users.get(currentUserId)!.photoURL}
                  alt="Your story"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center text-white font-bold text-xl">
                  {(users.get(currentUserId)?.displayName || "Y")[0].toUpperCase()}
                </div>
              )}
            </div>
          </button>

          {/* Add Button */}
          <button
            onClick={onAddStory}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <span className="text-xs text-muted-foreground">Your story</span>
      </div>

      {/* Other Users' Stories */}
      {otherUserIds.map(userId => {
        const user = users.get(userId)
        const hasViewed = hasViewedAllStories(userId)
        const displayName = partnerNickname || user?.displayName || "User"

        return (
          <button
            key={userId}
            onClick={() => onViewStory(userId)}
            className="flex flex-col items-center gap-1 shrink-0"
          >
            <div
              className={cn(
                "w-16 h-16 rounded-full p-0.5",
                hasViewed
                  ? "bg-muted"
                  : "bg-gradient-to-br from-pink-500 via-red-500 to-orange-500"
              )}
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-background">
                {user?.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={displayName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold text-xl">
                    {displayName[0].toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <span className="text-xs text-muted-foreground truncate w-16 text-center">
              {displayName.split(" ")[0]}
            </span>
          </button>
        )
      })}

      {/* Empty State */}
      {otherUserIds.length === 0 && myStories.length === 0 && (
        <div className="flex items-center justify-center text-sm text-muted-foreground px-4">
          No stories yet. Be the first!
        </div>
      )}
    </div>
  )
}
