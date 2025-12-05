"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/contexts/AuthContext"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { User, Lock, Bell, CreditCard, Shield, Webhook, Settings, Sparkles, Cloud } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { supabase } from '@/lib/supabaseClient'
import { StripeWebhookSetupModal } from "@/components/StripeWebhookSetupModal"

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("profile")
  const [formData, setFormData] = useState({
    username: "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileData, setProfileData] = useState({
    username: '',
    email: user?.email || '',
    bio: '',
    website: '',
    twitter: '',
    instagram: '',
  })
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    newFollower: true,
    newComment: true,
    beatSale: true,
  })
  const [paymentMethod, setPaymentMethod] = useState('credit_card')
  const [creditCardData, setCreditCardData] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
  })
  const [bankData, setBankData] = useState({
    accountNumber: '',
    routingNumber: '',
  })
  const [showWebhookModal, setShowWebhookModal] = useState(false)

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  useEffect(() => {
    async function fetchDisplayName() {
      if (user?.id) {
        const { data, error } = await supabase
          .from('users')
          .select('display_name')
          .eq('id', user.id)
          .single();
        if (data?.display_name) {
          setFormData(f => ({ ...f, username: data.display_name }));
        }
      }
    }
    fetchDisplayName();
  }, [user]);

  if (!user) return null

  const isAdminOrCEO = user.role === 'admin' || user.role === 'ceo'

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value })
  }

  const handleNotificationChange = (setting: string) => {
    setNotificationSettings(prev => ({ ...prev, [setting]: !prev[setting as keyof typeof prev] }))
  }

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value)
  }

  const handleCreditCardChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCreditCardData({ ...creditCardData, [e.target.name]: e.target.value })
  }

  const handleBankDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBankData({ ...bankData, [e.target.name]: e.target.value })
  }

  const handleAccountChange = (accountType: string) => {
    toast({
      title: "Account Change",
      description: `You've selected to change your account to ${accountType}. Redirecting to confirmation page.`,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement profile update logic
    console.log('Profile updated:', profileData)
    console.log('Notification settings:', notificationSettings)
    console.log('Payment method:', paymentMethod)
    console.log('Credit card data:', creditCardData)
    console.log('Bank data:', bankData)
    toast({
      title: "Settings Updated",
      description: "Your profile, notification settings, and payment details have been saved.",
    })
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 font-display tracking-wider text-primary">Settings</h1>
          <p className="text-xl text-gray-400">Manage your account settings</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-medium">Logged in as</p>
          <p className="text-primary">{formData.username || user?.email?.split('@')[0]}</p>
          <p className="text-sm text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className={`grid w-full ${isAdminOrCEO ? 'grid-cols-6' : 'grid-cols-4'}`}>
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="cloud-services">
            <Cloud className="h-4 w-4 mr-2" />
            Cloud Services
          </TabsTrigger>
          {isAdminOrCEO && (
            <>
              <TabsTrigger value="ai-settings">
                <Settings className="h-4 w-4 mr-2" />
                AI Settings
              </TabsTrigger>
              <TabsTrigger value="ai-info">
                <Sparkles className="h-4 w-4 mr-2" />
                AI Prompt
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Update your profile information</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    placeholder="Enter your username"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="Enter your email"
                  />
                </div>
                <Button className="mt-4">Save Changes</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Billing Settings</CardTitle>
              <CardDescription>Manage your subscription and payment methods</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <Label className="text-lg font-semibold">Current Account Type</Label>
                  <p className="text-white mt-1">{user?.subscription_tier?.replace('_', ' ') || 'Free Account'}</p>
                </div>
                <div className="flex space-x-4">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="gradient-button text-black font-medium hover:text-white">
                        Upgrade Account
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => handleAccountChange('pro_artist')}>
                        Pro Artist ($15/month)
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleAccountChange('producer_premium')}>
                        Producer Premium ($12/month)
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleAccountChange('producer_business')}>
                        Producer Business ($25/month)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline">
                        Downgrade Account
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onSelect={() => handleAccountChange('artist_free')}>
                        Artist Free
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => handleAccountChange('producer_free')}>
                        Producer Free
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="pt-4 border-t border-gray-700">
                  <Button
                    variant="outline"
                    onClick={() => setShowWebhookModal(true)}
                    className="flex items-center gap-2"
                  >
                    <Webhook className="h-4 w-4" />
                    Set up webhook testing
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Subscription</CardTitle>
              <CardDescription>Manage your subscription plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="text-lg font-semibold">Current Plan: <span className="capitalize">{user?.subscription_tier?.replace('_', ' ') || 'None'}</span></div>
                <div className="text-md text-gray-400">Status: <span className="capitalize">{user?.subscription_status || 'Unknown'}</span></div>
              </div>
              {user?.subscription_tier && user.subscription_tier !== 'free' && (
                <Button variant="destructive" className="mt-2">Cancel Subscription</Button>
              )}
              {(!user?.subscription_tier || user.subscription_tier === 'free') && (
                <div className="text-green-500 mt-2">You are on a free plan.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cloud-services" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Cloud Services</CardTitle>
              <CardDescription>Manage your storage provider preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-gray-400">
                  Configure where your files are stored. Choose between Supabase storage, system-wide storage, or your own cloud storage.
                </p>
                <Button
                  onClick={() => router.push('/cloud-services')}
                  className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300"
                >
                  <Cloud className="h-4 w-4 mr-2" />
                  Open Cloud Services
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {isAdminOrCEO && (
          <>
            <TabsContent value="ai-settings" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI Settings</CardTitle>
                  <CardDescription>Configure AI provider API keys and model settings</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-400">
                      Manage AI provider configurations, API keys, and model preferences.
                    </p>
                    <Button
                      onClick={() => router.push('/ai-settings')}
                      className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Open AI Settings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="ai-info" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>AI System Prompt Builder</CardTitle>
                  <CardDescription>Configure the system prompt that defines how the AI assistant behaves</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-400">
                      Build and manage the system prompt that controls the AI chatbot's behavior and responses.
                    </p>
                    <Button
                      onClick={() => router.push('/ai-info')}
                      className="bg-gradient-to-r from-[#F4C430] to-[#E8E8E8] text-black font-semibold hover:scale-105 transition-all duration-300"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Open AI Prompt Builder
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        )}
      </Tabs>

      <StripeWebhookSetupModal
        isOpen={showWebhookModal}
        onClose={() => setShowWebhookModal(false)}
      />
    </div>
  )
}

