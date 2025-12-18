"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Lock, Unlock, Eye, EyeOff, Trash2, Play, X, Image as ImageIcon, Video } from "lucide-react"
import { cn } from "@/lib/utils"
import { hashPin, verifyPin } from "@/lib/crypto/pin"
import {
  getVaultItems,
  deleteVaultItem,
  updateUserProfile,
  getUserProfile,
  type VaultItem,
} from "@/lib/firebase/firestore"

interface SecretVaultProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

export function SecretVault({ open, onOpenChange, userId }: SecretVaultProps) {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [hasPin, setHasPin] = useState<boolean | null>(null)
  const [pin, setPin] = useState("")
  const [confirmPin, setConfirmPin] = useState("")
  const [showPin, setShowPin] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [vaultItems, setVaultItems] = useState<VaultItem[]>([])
  const [selectedItem, setSelectedItem] = useState<VaultItem | null>(null)
  const [itemToDelete, setItemToDelete] = useState<VaultItem | null>(null)
  const [storedPinHash, setStoredPinHash] = useState<string | null>(null)

  // Check if user has a vault PIN set up
  useEffect(() => {
    if (open && userId) {
      checkVaultPin()
    }
  }, [open, userId])

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setIsUnlocked(false)
      setPin("")
      setConfirmPin("")
      setError("")
      setSelectedItem(null)
    }
  }, [open])

  const checkVaultPin = async () => {
    try {
      const profile = await getUserProfile(userId)
      if (profile?.vaultPinHash) {
        setHasPin(true)
        setStoredPinHash(profile.vaultPinHash)
      } else {
        setHasPin(false)
      }
    } catch (error) {
      console.error("Failed to check vault PIN:", error)
      setHasPin(false)
    }
  }

  const loadVaultItems = async () => {
    try {
      const items = await getVaultItems(userId)
      setVaultItems(items)
    } catch (error) {
      console.error("Failed to load vault items:", error)
    }
  }

  const handleSetupPin = async () => {
    if (pin.length < 4) {
      setError("PIN must be at least 4 digits")
      return
    }

    if (pin !== confirmPin) {
      setError("PINs do not match")
      return
    }

    setLoading(true)
    try {
      const pinHash = await hashPin(pin)
      await updateUserProfile(userId, { vaultPinHash: pinHash })
      setStoredPinHash(pinHash)
      setHasPin(true)
      setIsUnlocked(true)
      setError("")
      await loadVaultItems()
    } catch (error) {
      console.error("Failed to set up PIN:", error)
      setError("Failed to set up PIN")
    } finally {
      setLoading(false)
    }
  }

  const handleUnlock = async () => {
    if (!storedPinHash) return

    setLoading(true)
    try {
      const isValid = await verifyPin(pin, storedPinHash)
      if (isValid) {
        setIsUnlocked(true)
        setError("")
        await loadVaultItems()
      } else {
        setError("Incorrect PIN")
      }
    } catch (error) {
      console.error("Failed to verify PIN:", error)
      setError("Verification failed")
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteItem = async () => {
    if (!itemToDelete?.id) return

    try {
      await deleteVaultItem(userId, itemToDelete.id)
      setVaultItems(prev => prev.filter(item => item.id !== itemToDelete.id))
      setItemToDelete(null)
    } catch (error) {
      console.error("Failed to delete vault item:", error)
    }
  }

  const formatDate = (timestamp: any) => {
    if (!timestamp) return ""
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })
  }

  // PIN Setup View
  if (hasPin === false) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Set Up Vault PIN
            </DialogTitle>
            <DialogDescription>
              Create a 4-digit PIN to protect your secret vault. Photos and videos shared in chat are automatically moved here after 24 hours.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-pin">Create PIN</Label>
              <div className="relative">
                <Input
                  id="new-pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 4-6 digit PIN"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input
                id="confirm-pin"
                type={showPin ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Confirm your PIN"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleSetupPin} disabled={loading} className="w-full">
              {loading ? "Setting up..." : "Set Up PIN"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // PIN Entry View
  if (!isUnlocked) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Enter Vault PIN
            </DialogTitle>
            <DialogDescription>
              Enter your PIN to access your secret vault
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vault-pin">PIN</Label>
              <div className="relative">
                <Input
                  id="vault-pin"
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter your PIN"
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0"
                  onClick={() => setShowPin(!showPin)}
                >
                  {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button onClick={handleUnlock} disabled={loading || pin.length < 4} className="w-full">
              {loading ? "Verifying..." : "Unlock Vault"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // Vault Content View
  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Unlock className="h-5 w-5 text-green-500" />
              Secret Vault
            </DialogTitle>
            <DialogDescription>
              {vaultItems.length} item{vaultItems.length !== 1 ? "s" : ""} archived
            </DialogDescription>
          </DialogHeader>

          {vaultItems.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              <Lock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Your vault is empty</p>
              <p className="text-sm mt-1">
                Photos and videos will appear here after 24 hours
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[50vh]">
              <div className="grid grid-cols-3 gap-2 p-1">
                {vaultItems.map((item) => (
                  <div
                    key={item.id}
                    className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-pointer group"
                    onClick={() => setSelectedItem(item)}
                  >
                    {item.type === "image" ? (
                      <img
                        src={item.storageUrl}
                        alt="Vault item"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <>
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt="Video thumbnail"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800">
                            <Video className="h-8 w-8 text-white/50" />
                          </div>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-10 h-10 rounded-full bg-black/50 flex items-center justify-center">
                            <Play className="h-5 w-5 text-white ml-0.5" />
                          </div>
                        </div>
                      </>
                    )}

                    {/* Type indicator */}
                    <div className="absolute top-1 left-1 p-1 bg-black/50 rounded">
                      {item.type === "image" ? (
                        <ImageIcon className="h-3 w-3 text-white" />
                      ) : (
                        <Video className="h-3 w-3 text-white" />
                      )}
                    </div>

                    {/* Delete button on hover */}
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation()
                        setItemToDelete(item)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>

                    {/* Date overlay */}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                      <p className="text-[10px] text-white/80 text-center">
                        {formatDate(item.originalCreatedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Media Viewer */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent
          className="max-w-[90vw] max-h-[90vh] p-0 bg-black/95 border-none"
          showCloseButton={false}
        >
          <DialogTitle className="sr-only">Media viewer</DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 text-white hover:bg-white/20"
            onClick={() => setSelectedItem(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          {selectedItem?.type === "image" ? (
            <img
              src={selectedItem.storageUrl}
              alt="Vault media"
              className="max-w-full max-h-[85vh] object-contain mx-auto"
            />
          ) : selectedItem?.type === "video" ? (
            <video
              src={selectedItem.storageUrl}
              controls
              autoPlay
              className="max-w-full max-h-[85vh] mx-auto"
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!itemToDelete} onOpenChange={() => setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete from vault?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this {itemToDelete?.type} from your vault. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
