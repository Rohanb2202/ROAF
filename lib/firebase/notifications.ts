import { getToken, onMessage } from "firebase/messaging"
import { messaging } from "./config"
import { getVapidKey } from "./actions"

// Note: VAPID keys are PUBLIC keys and safe to expose to clients
// They are part of the Web Push protocol specification
// The private key remains secure on Firebase servers
export async function requestNotificationPermission(): Promise<string | null> {
  // This function should only be called client-side
  if (typeof window === "undefined") {
    return null
  }

  if (!messaging) {
    console.log("Messaging not supported")
    return null
  }

  try {
    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      // Fetch VAPID key from server action
      const vapidKey = await getVapidKey()
      if (!vapidKey) {
        console.warn("VAPID key not configured")
        return null
      }

      const token = await getToken(messaging, { vapidKey })
      console.log("FCM Token:", token)
      return token
    }
    return null
  } catch (error) {
    console.error("Error getting notification permission:", error)
    return null
  }
}

export function onMessageListener() {
  if (!messaging) return () => {}

  return onMessage(messaging, (payload) => {
    console.log("Message received:", payload)
    // Handle foreground notifications
    if (Notification.permission === "granted") {
      new Notification(payload.notification?.title || "New Message", {
        body: payload.notification?.body || "You have a new message",
        icon: "/logo.png",
      })
    }
  })
}
