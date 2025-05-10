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
import { User, Lock, Bell, CreditCard, Shield } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function SettingsPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState("profile")
  const [formData, setFormData] = useState({
    username: user?.username || "",
    email: user?.email || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileData, setProfileData] = useState({
    username: user?.username || '',
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

  useEffect(() => {
    if (!user) {
      router.push("/login")
    }
  }, [user, router])

  if (!user) return null

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
          <p className="text-primary">{user?.username || user?.email?.split('@')[0]}</p>
          <p className="text-sm text-gray-400 capitalize">{user?.role?.replace('_', ' ')}</p>
        </div>
      </div>

      <Tabs defaultValue="profile" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="h-4 w-4 mr-2" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="privacy">
            <Shield className="h-4 w-4 mr-2" />
            Privacy
          </TabsTrigger>
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

        <TabsContent value="security" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Update your password and security settings</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <Input
                    id="currentPassword"
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">New Password</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                    placeholder="Enter your new password"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    placeholder="Confirm your new password"
                  />
                </div>
                <Button className="mt-4">Update Password</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Notification settings coming soon...</p>
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
                  <p className="text-white mt-1">{user?.subscription || 'Free Account'}</p>
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
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Privacy Settings</CardTitle>
              <CardDescription>Manage your privacy preferences</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">Privacy settings coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

