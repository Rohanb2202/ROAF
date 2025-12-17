"use server"

// Server action to safely retrieve public VAPID key
export async function getVapidKey(): Promise<string | null> {
  // VAPID keys are public keys - this is safe to return to client
  return process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || null
}
