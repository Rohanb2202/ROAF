"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { signInWithEmail, signUpWithEmail, setupRecaptcha, signInWithPhone } from "@/lib/firebase/auth"
import { useAuth } from "@/lib/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
// Tabs kept for phone sign-in if re-enabled later
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Heart } from "lucide-react"
import type { ConfirmationResult } from "firebase/auth"

export default function LoginPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [phoneNumber, setPhoneNumber] = useState("")
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null)
  const { toast } = useToast()

  // Redirect logged-in users to chat
  useEffect(() => {
    if (!authLoading && user) {
      router.replace("/chat")
    }
  }, [user, authLoading, router])

  // Show loading while checking auth
  if (authLoading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const handleEmailLogin = async (isSignUp: boolean) => {
    if (!email || !password) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password)
        toast({
          title: "Success",
          description: "Account created successfully! Please save your UID from settings.",
        })
      } else {
        await signInWithEmail(email, password)
        toast({
          title: "Welcome back!",
          description: "Logged in successfully",
        })
      }
      router.push("/chat")
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Authentication failed",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePhoneSignIn = async () => {
    if (!phoneNumber) {
      toast({
        title: "Error",
        description: "Please enter a phone number",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      const recaptcha = await setupRecaptcha("recaptcha-container")
      const result = await signInWithPhone(phoneNumber, recaptcha)
      setConfirmationResult(result)
      toast({
        title: "OTP Sent",
        description: "Check your phone for the verification code",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send OTP",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (!confirmationResult || !otp) {
      toast({
        title: "Error",
        description: "Please enter the OTP",
        variant: "destructive",
      })
      return
    }

    setLoading(true)
    try {
      await confirmationResult.confirm(otp)
      toast({
        title: "Success",
        description: "Phone verified successfully",
      })
      router.push("/chat")
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Invalid OTP",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-secondary/30 to-background">
      <div id="recaptcha-container"></div>

      <Card className="w-full max-w-md shadow-2xl border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex flex-col items-center gap-2">
            <img src="/logo.png" alt="ROAF Logo" className="w-20 h-20 object-contain" />
            <img src="/title_logo.png" alt="ROAF - Connecting 2 Souls" className="h-14 w-auto object-contain" />
          </div>
          <CardDescription className="text-balance">Private end-to-end encrypted chat</CardDescription>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>

            <Button onClick={() => handleEmailLogin(false)} disabled={loading} className="w-full">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign In"}
            </Button>
          </div>

          {/* Phone Sign In - Commented out for now
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email">Email</TabsTrigger>
              <TabsTrigger value="phone">Phone</TabsTrigger>
            </TabsList>

            <TabsContent value="phone" className="space-y-4 mt-4">
              {!confirmationResult ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1234567890"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <Button onClick={handlePhoneSignIn} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send OTP"}
                  </Button>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      type="text"
                      placeholder="123456"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value)}
                      disabled={loading}
                      maxLength={6}
                    />
                  </div>

                  <Button onClick={handleVerifyOTP} disabled={loading} className="w-full">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Verify OTP"}
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
          */}

          <div className="mt-6 text-center text-sm text-muted-foreground">
            <Heart className="inline h-4 w-4 text-primary" /> Secure & Private
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
