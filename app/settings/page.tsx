"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/context/auth-context"
import { signOut, updatePassword, updateEmail } from "@/lib/firebase/auth"
import { requestNotificationPermission } from "@/lib/firebase/notifications"
import { updateUserProfile, getUserProfile, type UserProfile } from "@/lib/firebase/firestore"
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"
import { storage } from "@/lib/firebase/config"
import { compressImage } from "@/lib/media-compress"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ProfileAvatar } from "@/components/chat/profile-avatar"
import { ArrowLeft, Bell, Shield, LogOut, Copy, Check, Smartphone, Lock, Key, Camera, Loader2, User, Heart, Mail, Palette, Eye, EyeOff } from "lucide-react"
import Image from "next/image"
import { hashPin, verifyPin } from "@/lib/crypto/pin"

export default function SettingsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [copied, setCopied] = useState(false)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [isSavingName, setIsSavingName] = useState(false)
  const [partnerNickname, setPartnerNickname] = useState("")
  const [isSavingNickname, setIsSavingNickname] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [newEmail, setNewEmail] = useState("")
  const [emailPassword, setEmailPassword] = useState("")
  const [isChangingEmail, setIsChangingEmail] = useState(false)
  const [chatBackground, setChatBackground] = useState("")
  const [hasVaultPin, setHasVaultPin] = useState(false)
  const [currentVaultPin, setCurrentVaultPin] = useState("")
  const [newVaultPin, setNewVaultPin] = useState("")
  const [confirmVaultPin, setConfirmVaultPin] = useState("")
  const [isChangingVaultPin, setIsChangingVaultPin] = useState(false)
  const [showVaultPins, setShowVaultPins] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)

  const CHAT_BACKGROUNDS = [
    { id: "default", name: "Default", class: "bg-background" },
    { id: "gradient-love", name: "Love", class: "bg-gradient-to-br from-pink-100 via-red-50 to-rose-100 dark:from-pink-950 dark:via-red-950 dark:to-rose-950" },
    { id: "gradient-ocean", name: "Ocean", class: "bg-gradient-to-br from-blue-100 via-cyan-50 to-teal-100 dark:from-blue-950 dark:via-cyan-950 dark:to-teal-950" },
    { id: "gradient-sunset", name: "Sunset", class: "bg-gradient-to-br from-orange-100 via-pink-50 to-purple-100 dark:from-orange-950 dark:via-pink-950 dark:to-purple-950" },
    { id: "gradient-forest", name: "Forest", class: "bg-gradient-to-br from-green-100 via-emerald-50 to-teal-100 dark:from-green-950 dark:via-emerald-950 dark:to-teal-950" },
    { id: "gradient-lavender", name: "Lavender", class: "bg-gradient-to-br from-purple-100 via-violet-50 to-indigo-100 dark:from-purple-950 dark:via-violet-950 dark:to-indigo-950" },
  ]

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    const loadProfile = async () => {
      if (user?.uid) {
        const userProfile = await getUserProfile(user.uid)
        if (userProfile) {
          setProfile(userProfile)
          setDisplayName(userProfile.displayName || "")
          setPartnerNickname(userProfile.partnerNickname || "")
          setChatBackground(userProfile.chatBackground || "default")
          setHasVaultPin(!!userProfile.vaultPinHash)
        }
      }
    }
    loadProfile()
  }, [user])

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted")
    }
  }, [])

  const handleCopyUID = () => {
    if (user?.uid) {
      navigator.clipboard.writeText(user.uid)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "User ID copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user?.uid) return

    setIsUploadingPhoto(true)
    try {
      // Compress the image
      const compressed = await compressImage(file)

      // Upload to Firebase Storage
      const filename = `profile_${Date.now()}.webp`
      const storageRef = ref(storage, `users/${user.uid}/profile/${filename}`)
      await uploadBytes(storageRef, compressed.blob)
      const photoURL = await getDownloadURL(storageRef)

      // Update Firestore
      await updateUserProfile(user.uid, { photoURL })
      setProfile((prev) => prev ? { ...prev, photoURL } : null)

      toast({
        title: "Photo Updated",
        description: "Your profile photo has been updated",
      })
    } catch (error) {
      console.error("Failed to upload photo:", error)
      toast({
        title: "Upload Failed",
        description: "Failed to upload profile photo",
        variant: "destructive",
      })
    } finally {
      setIsUploadingPhoto(false)
      e.target.value = ""
    }
  }

  const handleSaveDisplayName = async () => {
    if (!user?.uid || !displayName.trim()) return

    setIsSavingName(true)
    try {
      await updateUserProfile(user.uid, { displayName: displayName.trim() })
      setProfile((prev) => prev ? { ...prev, displayName: displayName.trim() } : null)
      toast({
        title: "Name Updated",
        description: "Your display name has been updated",
      })
    } catch (error) {
      console.error("Failed to update name:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update display name",
        variant: "destructive",
      })
    } finally {
      setIsSavingName(false)
    }
  }

  const handleSavePartnerNickname = async () => {
    if (!user?.uid) return

    setIsSavingNickname(true)
    try {
      await updateUserProfile(user.uid, { partnerNickname: partnerNickname.trim() })
      setProfile((prev) => prev ? { ...prev, partnerNickname: partnerNickname.trim() } : null)
      toast({
        title: "Nickname Saved",
        description: "Your partner's nickname has been updated",
      })
    } catch (error) {
      console.error("Failed to save nickname:", error)
      toast({
        title: "Update Failed",
        description: "Failed to save nickname",
        variant: "destructive",
      })
    } finally {
      setIsSavingNickname(false)
    }
  }

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      })
      return
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      await updatePassword(currentPassword, newPassword)
      toast({
        title: "Password Changed",
        description: "Your password has been updated successfully",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Failed to change password:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to change password. Check your current password.",
        variant: "destructive",
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!emailPassword || !newEmail) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setIsChangingEmail(true)
    try {
      await updateEmail(emailPassword, newEmail)
      toast({
        title: "Email Changed",
        description: "Your email has been updated successfully",
      })
      setEmailPassword("")
      setNewEmail("")
    } catch (error: any) {
      console.error("Failed to change email:", error)
      toast({
        title: "Update Failed",
        description: error.message || "Failed to change email. Check your password.",
        variant: "destructive",
      })
    } finally {
      setIsChangingEmail(false)
    }
  }

  const handleChangeChatBackground = async (backgroundId: string) => {
    if (!user?.uid) return

    try {
      await updateUserProfile(user.uid, { chatBackground: backgroundId })
      setChatBackground(backgroundId)
      setProfile((prev) => prev ? { ...prev, chatBackground: backgroundId } : null)
      toast({
        title: "Background Updated",
        description: "Your chat background has been changed",
      })
    } catch (error) {
      console.error("Failed to change background:", error)
      toast({
        title: "Update Failed",
        description: "Failed to change background",
        variant: "destructive",
      })
    }
  }

  const handleChangeVaultPin = async () => {
    if (!user?.uid) return

    // Validation
    if (hasVaultPin && !currentVaultPin) {
      toast({
        title: "Error",
        description: "Please enter your current PIN",
        variant: "destructive",
      })
      return
    }

    if (newVaultPin.length < 4) {
      toast({
        title: "Error",
        description: "PIN must be at least 4 digits",
        variant: "destructive",
      })
      return
    }

    if (newVaultPin !== confirmVaultPin) {
      toast({
        title: "Error",
        description: "New PINs do not match",
        variant: "destructive",
      })
      return
    }

    setIsChangingVaultPin(true)
    try {
      // If they have a PIN, verify the current one
      if (hasVaultPin && profile?.vaultPinHash) {
        const isValid = await verifyPin(currentVaultPin, profile.vaultPinHash)
        if (!isValid) {
          toast({
            title: "Error",
            description: "Current PIN is incorrect",
            variant: "destructive",
          })
          setIsChangingVaultPin(false)
          return
        }
      }

      // Hash and save new PIN
      const newPinHash = await hashPin(newVaultPin)
      await updateUserProfile(user.uid, { vaultPinHash: newPinHash })
      setProfile((prev) => prev ? { ...prev, vaultPinHash: newPinHash } : null)
      setHasVaultPin(true)

      toast({
        title: hasVaultPin ? "PIN Changed" : "PIN Created",
        description: hasVaultPin ? "Your vault PIN has been updated" : "Your vault PIN has been created",
      })

      // Clear fields
      setCurrentVaultPin("")
      setNewVaultPin("")
      setConfirmVaultPin("")
    } catch (error) {
      console.error("Failed to change vault PIN:", error)
      toast({
        title: "Update Failed",
        description: "Failed to update vault PIN",
        variant: "destructive",
      })
    } finally {
      setIsChangingVaultPin(false)
    }
  }

  const handleToggleNotifications = async (enabled: boolean) => {
    if (enabled) {
      const token = await requestNotificationPermission()
      if (token) {
        setNotificationsEnabled(true)
        toast({
          title: "Notifications Enabled",
          description: "You'll receive push notifications for new messages",
        })
      } else {
        toast({
          title: "Permission Denied",
          description: "Please enable notifications in your browser settings",
          variant: "destructive",
        })
      }
    } else {
      setNotificationsEnabled(false)
      toast({
        title: "Notifications Disabled",
        description: "You won't receive push notifications",
      })
    }
  }

  const handleSignOut = async () => {
    await signOut()
    toast({
      title: "Signed Out",
      description: "You have been logged out successfully",
    })
    router.push("/login")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push("/chat")}>
          <ArrowLeft className="h-5 w-5" />
          <span className="sr-only">Back to chat</span>
        </Button>
        <div className="flex items-center gap-2">
          <div className="relative w-8 h-8">
            <Image src="/logo.png" alt="ROAF" fill className="object-contain" />
          </div>
          <h1 className="font-semibold text-lg">Settings</h1>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-4 space-y-4">
        {/* Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Profile
            </CardTitle>
            <CardDescription>Manage your profile photo and display name</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Profile Photo */}
            <div className="flex items-center gap-4">
              <div className="relative">
                <ProfileAvatar
                  photoURL={profile?.photoURL}
                  displayName={profile?.displayName}
                  email={user?.email || undefined}
                  size="xl"
                  expandable={true}
                />
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full shadow-md"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                >
                  {isUploadingPhoto ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Camera className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  Tap the camera icon to change your profile photo.
                  Photos are visible to other users.
                </p>
              </div>
            </div>

            <Separator />

            {/* Display Name */}
            <div className="space-y-2">
              <Label htmlFor="displayName">Display Name</Label>
              <div className="flex gap-2">
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your name"
                />
                <Button
                  onClick={handleSaveDisplayName}
                  disabled={isSavingName || displayName === profile?.displayName}
                >
                  {isSavingName ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Partner Nickname */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              Partner Nickname
            </CardTitle>
            <CardDescription>Give your partner a special nickname (only you can see it)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                value={partnerNickname}
                onChange={(e) => setPartnerNickname(e.target.value)}
                placeholder="Babe, Honey, My Love..."
              />
              <Button
                onClick={handleSavePartnerNickname}
                disabled={isSavingNickname || partnerNickname === profile?.partnerNickname}
              >
                {isSavingNickname ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Save"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Chat Background */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Chat Background
            </CardTitle>
            <CardDescription>Choose a background theme for your chat</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {CHAT_BACKGROUNDS.map((bg) => (
                <button
                  key={bg.id}
                  onClick={() => handleChangeChatBackground(bg.id)}
                  className={`relative h-20 rounded-lg border-2 transition-all ${bg.class} ${
                    chatBackground === bg.id
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 text-xs font-medium bg-background/80 px-2 py-0.5 rounded">
                    {bg.name}
                  </span>
                  {chatBackground === bg.id && (
                    <Check className="absolute top-1 right-1 h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Account Information */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details and user ID</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm text-muted-foreground">Email / Phone</Label>
              <p className="font-medium">{user?.email || user?.phoneNumber || "Not available"}</p>
            </div>

            <div>
              <Label className="text-sm text-muted-foreground">User ID (UID)</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="flex-1 bg-muted px-3 py-2 rounded text-sm font-mono overflow-x-auto">{user?.uid}</code>
                <Button onClick={handleCopyUID} size="icon" variant="outline">
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  <span className="sr-only">Copy UID</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Security Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Status
            </CardTitle>
            <CardDescription>End-to-end encryption and privacy features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">End-to-End Encryption</span>
              </div>
              <Badge variant="default">Active</Badge>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Local Key Storage</span>
              </div>
              <Badge variant="default">Secured</Badge>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 mt-4">
              <p className="text-xs text-muted-foreground leading-relaxed">
                All messages are encrypted on your device before being sent. Firebase never sees your plaintext
                messages. Your encryption keys are stored locally and never leave your device.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vault PIN */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Secret Vault PIN
            </CardTitle>
            <CardDescription>
              {hasVaultPin ? "Change your vault PIN" : "Set up a PIN to protect your secret vault"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasVaultPin && (
              <div className="space-y-2">
                <Label htmlFor="currentVaultPin">Current PIN</Label>
                <div className="relative">
                  <Input
                    id="currentVaultPin"
                    type={showVaultPins ? "text" : "password"}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    value={currentVaultPin}
                    onChange={(e) => setCurrentVaultPin(e.target.value.replace(/\D/g, ""))}
                    placeholder="Enter current PIN"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowVaultPins(!showVaultPins)}
                  >
                    {showVaultPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="newVaultPin">{hasVaultPin ? "New PIN" : "Create PIN"}</Label>
              <div className="relative">
                <Input
                  id="newVaultPin"
                  type={showVaultPins ? "text" : "password"}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={newVaultPin}
                  onChange={(e) => setNewVaultPin(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 4-6 digit PIN"
                />
                {!hasVaultPin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0"
                    onClick={() => setShowVaultPins(!showVaultPins)}
                  >
                    {showVaultPins ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmVaultPin">Confirm PIN</Label>
              <Input
                id="confirmVaultPin"
                type={showVaultPins ? "text" : "password"}
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmVaultPin}
                onChange={(e) => setConfirmVaultPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Confirm your PIN"
              />
            </div>
            <Button
              onClick={handleChangeVaultPin}
              disabled={isChangingVaultPin || newVaultPin.length < 4 || !confirmVaultPin || (hasVaultPin && !currentVaultPin)}
              className="w-full"
            >
              {isChangingVaultPin ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {hasVaultPin ? "Change PIN" : "Set Up PIN"}
            </Button>
            <p className="text-xs text-muted-foreground">
              Your vault stores photos and videos after 24 hours. The PIN protects access to these memories.
            </p>
          </CardContent>
        </Card>

        {/* Change Password */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription>Update your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
              />
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
              className="w-full"
            >
              {isChangingPassword ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* Change Email */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Change Email
            </CardTitle>
            <CardDescription>Update your account email address</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="newEmail">New Email Address</Label>
              <Input
                id="newEmail"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="Enter new email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emailPassword">Current Password</Label>
              <Input
                id="emailPassword"
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                placeholder="Enter password to confirm"
              />
            </div>
            <Button
              onClick={handleChangeEmail}
              disabled={isChangingEmail || !newEmail || !emailPassword}
              className="w-full"
            >
              {isChangingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Change Email
            </Button>
          </CardContent>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>Manage push notifications for new messages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">Get notified when you receive new messages</p>
              </div>
              <Switch id="notifications" checked={notificationsEnabled} onCheckedChange={handleToggleNotifications} />
            </div>
          </CardContent>
        </Card>

        {/* PWA Install */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Progressive Web App
            </CardTitle>
            <CardDescription>Install ROAF on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground leading-relaxed">
                Install ROAF on your phone or desktop for a native app experience. Works offline and provides quick
                access from your home screen.
              </p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>iOS: Tap Share → Add to Home Screen</li>
                <li>Android: Tap Menu → Install App</li>
                <li>Desktop: Click install icon in address bar</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <LogOut className="h-5 w-5" />
              Sign Out
            </CardTitle>
            <CardDescription>Log out of your account</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleSignOut} variant="destructive" className="w-full">
              Sign Out
            </Button>
          </CardContent>
        </Card>

        {/* App Version */}
        <div className="text-center text-sm text-muted-foreground pb-8">
          <p>ROAF v1.0.0</p>
          <p className="text-xs">Private & Secure</p>
        </div>
      </div>
    </div>
  )
}
