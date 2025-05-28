"use client"

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabaseClient'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { Edit, Save, X, Plus } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface License {
  id: string
  name: string
  description: string
  terms: string
  is_exclusive: boolean
  is_buyout: boolean
  created_at: string
  updated_at: string
}

const DEFAULT_LICENSES_META = [
  { name: 'Lease', is_exclusive: false, is_buyout: false },
  { name: 'Premium Lease', is_exclusive: false, is_buyout: false },
  { name: 'Exclusive', is_exclusive: true, is_buyout: false },
  { name: 'Buy Out', is_exclusive: false, is_buyout: true },
]

const LEASE_TERMS = `BEAT LICENSE AGREEMENT (LEASE LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE

Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., single, mixtape, EP, or small social media content).

---

2. USAGE RIGHTS

Licensee may:

* Distribute up to 5,000 copies/streams across all platforms
* Perform the song live up to 3 times
* Monetize on streaming platforms (e.g., Spotify, Apple Music, YouTube)
* Create one music video (non-televised)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell or license the Beat to any third party
* Claim ownership or copyright of the Beat
* Use the Beat in TV, film, or large commercial projects without an upgraded license
* Exceed the usage limits (requires upgrade to Premium or Exclusive license)

---

4. DELIVERY

The Beat will be delivered in MP3 format after payment is received.

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. TERMINATION

If Licensee violates the terms of this Agreement, the license is immediately revoked without refund, and all usage must cease.

---

7. OWNERSHIP

Licensor retains full ownership and copyright of the Beat. This license does not transfer any copyright or ownership to the Licensee.

---

8. PAYMENT

The License Fee for this Lease is $[Amount].

---

9. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---
`;

const PREMIUM_LEASE_TERMS = `BEAT LICENSE AGREEMENT (PREMIUM LEASE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE

Licensor grants Licensee a non-exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., album, EP, mixtape, YouTube content, podcast, or independent film).

---

2. USAGE RIGHTS

Licensee may:

* Distribute unlimited copies/streams across all platforms
* Monetize on streaming platforms (Spotify, Apple Music, YouTube, etc.)
* Use the Beat in one music video (non-televised or YouTube only)
* Perform the song live an unlimited number of times
* Use the Beat in small to mid-sized commercial projects (e.g., ads, promos, sync placements under $10,000 in budget)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell or license the Beat to any third party
* Claim ownership or copyright of the Beat
* Use the Beat in major commercial projects (e.g., films, TV, large-budget advertising campaigns) without an upgraded Exclusive or Buy Out license
* Exceed the scope of this license without written permission

---

4. DELIVERY

The Beat will be delivered in the following formats:
✅ MP3
✅ WAV
✅ Trackouts (Stems)

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. TERMINATION

If Licensee violates the terms of this Agreement, the license is immediately revoked without refund, and all usage must cease.

---

7. OWNERSHIP

Licensor retains full ownership and copyright of the Beat. This license does not transfer any copyright or ownership to the Licensee.

---

8. PAYMENT

The License Fee for this Premium Lease is $[Amount].

---

9. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---

10. SIGNATURES

By signing below, both parties agree to the terms of this Agreement.

Licensor (Producer): _______________________
Licensee (Artist): _______________________
Date: _______________________
`;

const EXCLUSIVE_TERMS = `BEAT LICENSE AGREEMENT (EXCLUSIVE LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE

Licensor grants Licensee an exclusive, non-transferable, non-sublicensable license to use the Beat for one (1) commercial or non-commercial project (e.g., album, single, film, podcast, commercial, or any media).

Upon purchase, the Beat will no longer be available for lease, exclusive, or sale to any other party.

---

2. USAGE RIGHTS

Licensee may:

* Distribute unlimited copies/streams across all platforms
* Monetize on streaming platforms (Spotify, Apple Music, YouTube, etc.)
* Use the Beat in unlimited music videos, films, TV, commercials, podcasts, and live performances
* Retain all master rights for the final song
* Sync the Beat in any project without limitations (budget, reach, or media type)

---

3. RESTRICTIONS

Licensee may NOT:

* Sell, transfer, or sublicense the Beat as-is (e.g., reselling the Beat for profit)
* Claim the underlying composition copyright of the Beat (unless a full Buy Out is purchased)

---

4. DELIVERY

The Beat will be delivered in the following formats:
✅ MP3
✅ WAV
✅ Trackouts (Stems)

Additional files (e.g., project files) available upon request.

---

5. CREDIT

Licensee agrees to credit the Licensor in all releases as follows:
"Produced by [Your Name / Producer Name]"

---

6. OWNERSHIP & COPYRIGHT

Licensor retains copyright ownership of the Beat (the musical composition and underlying work).
Licensee holds exclusive rights to commercially exploit the Beat as per this Agreement.

This is a license, not a copyright transfer. If full copyright transfer is desired, a separate Buy Out agreement must be executed.

---

7. PAYMENT

The License Fee for this Exclusive License is $[Amount].

---

8. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---

9. SIGNATURES

By signing below, both parties agree to the terms of this Agreement.

Licensor (Producer): _______________________
Licensee (Artist): _______________________
Date: _______________________
`;

const BUYOUT_TERMS = `BEAT LICENSE AGREEMENT (BUY OUT / FULL RIGHTS LICENSE)

This Beat License Agreement ("Agreement") is made on [Date], by and between:

Licensor (Producer): [Your Name / Producer Name]
Licensee (Artist): [Artist's Name]

Beat Title: [Name of Beat]
Beat ID/Reference: [Optional - For internal tracking]

---

1. GRANT OF LICENSE & FULL RIGHTS TRANSFER

Licensor agrees to sell and transfer to Licensee all rights, title, and interest in and to the Beat, including but not limited to:

* Full copyright ownership
* All publishing rights
* All master rights
* All reproduction, distribution, and modification rights

This is a permanent, one-time transfer. The Licensor relinquishes all rights to the Beat upon completion of payment.

---

2. USAGE RIGHTS

Licensee may:

* Use, distribute, modify, and monetize the Beat without limitation
* Claim full ownership of the Beat in any form (e.g., as part of a song, instrumental, soundtrack, film, advertisement, video game, etc.)
* Resell, license, or sublicense the Beat at their discretion
* Register the Beat with any copyright office, PRO, or sync platform as their own

---

3. DELIVERY

The Beat will be delivered in the following formats:
✅ MP3
✅ WAV
✅ Trackouts (Stems)
✅ Project Files (if available)

All original materials associated with the Beat will be transferred upon request.

---

4. CREDIT

Credit to the Licensor is not required, but is appreciated when reasonable. Suggested credit:
"Produced by [Your Name / Producer Name]"

---

5. PAYMENT

The total fee for this Buy Out License is $[Amount].

Full payment is required before transfer of rights. No refunds will be issued after delivery of files.

---

6. REPRESENTATIONS

Licensor guarantees that the Beat is original, free of third-party samples requiring clearance (unless otherwise disclosed in writing), and that the Licensor has full rights to sell and transfer ownership.

---

7. GOVERNING LAW

This Agreement shall be governed by and interpreted under the laws of [Your State/Country].

---

8. SIGNATURES

By signing below, both parties agree to the terms of this Agreement and acknowledge the transfer of full ownership rights.

Licensor (Producer): _______________________
Licensee (Artist): _______________________
Date: _______________________
`;

export default function MyLicensesPage() {
  const { user } = useAuth()
  const [licenses, setLicenses] = useState<License[]>([])
  const [loading, setLoading] = useState(true)
  const [editingLicense, setEditingLicense] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<string>("new")
  const [newLicense, setNewLicense] = useState<Partial<License>>({
    name: '',
    description: '',
    terms: '',
    is_exclusive: false,
    is_buyout: false
  })
  const [producerName, setProducerName] = useState<string>("")

  useEffect(() => {
    fetchLicenses()
    // Fetch producer display name
    async function fetchProducerName() {
      if (!user) return;
      const { data } = await supabase
        .from('producers')
        .select('display_name')
        .eq('user_id', user.id)
        .single();
      setProducerName(data?.display_name || user.email?.split('@')[0] || "")
    }
    fetchProducerName()
  }, [user])

  // Helper to inject producer name into contract
  function injectProducerName(terms: string) {
    return terms.replace(/\[Your Name \/ Producer Name\]/g, producerName)
  }

  const fetchLicenses = async () => {
    try {
      const { data, error } = await supabase
        .from('licenses')
        .select('*')
        .order('name')
      
      if (error) throw error
      setLicenses(data || [])
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to load licenses",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (license: License) => {
    setEditingLicense(license.id)
  }

  const handleSave = async (license: License) => {
    try {
      const { error } = await supabase
        .from('licenses')
        .update({
          name: license.name,
          description: license.description,
          terms: license.terms,
          is_exclusive: license.is_exclusive,
          is_buyout: license.is_buyout,
          updated_at: new Date().toISOString()
        })
        .eq('id', license.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "License updated successfully",
      })
      setEditingLicense(null)
      fetchLicenses()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update license",
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    setEditingLicense(null)
    fetchLicenses()
  }

  const handleCreate = async () => {
    try {
      const { error } = await supabase
        .from('licenses')
        .insert([{
          ...newLicense,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])

      if (error) throw error

      toast({
        title: "Success",
        description: "License created successfully",
      })
      setNewLicense({
        name: '',
        description: '',
        terms: '',
        is_exclusive: false,
        is_buyout: false
      })
      fetchLicenses()
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to create license",
        variant: "destructive",
      })
    }
  }

  // Helper to check if a license is a custom DB license
  const isCustomDbLicense = (license: License) => {
    return !!license.created_at && !DEFAULT_LICENSES_META.some(meta => meta.name === license.name)
  }

  // Add this function to handle deletion
  const handleDelete = async (license: License) => {
    if (!window.confirm(`Are you sure you want to delete the license "${license.name}"?`)) return;
    try {
      const { error } = await supabase.from('licenses').delete().eq('id', license.id)
      if (error) throw error
      toast({ title: 'Deleted', description: `License "${license.name}" deleted.` })
      setLicenses(licenses.filter(l => l.id !== license.id))
      setActiveTab('new')
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Failed to delete license', variant: 'destructive' })
    }
  }

  // Merge DB licenses with default templates
  const defaultTabs: License[] = DEFAULT_LICENSES_META.map(meta => {
    const found = licenses.find(l => l.name === meta.name)
    return found || {
      id: `template-${meta.name.toLowerCase().replace(/ /g, '-')}`,
      name: meta.name,
      description: '',
      terms:
        meta.name === 'Lease' ? LEASE_TERMS :
        meta.name === 'Premium Lease' ? PREMIUM_LEASE_TERMS :
        meta.name === 'Exclusive' ? EXCLUSIVE_TERMS :
        meta.name === 'Buy Out' ? BUYOUT_TERMS :
        '',
      is_exclusive: meta.is_exclusive,
      is_buyout: meta.is_buyout,
      created_at: '',
      updated_at: '',
    }
  })
  // Add any custom licenses (not one of the four defaults)
  const customTabs = licenses.filter(l => !DEFAULT_LICENSES_META.some(meta => meta.name === l.name))
  const licensesToShow = [...defaultTabs, ...customTabs]

  if (loading) {
    return <div>Loading...</div>
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold font-display tracking-wider text-primary">Manage Licenses</h1>
      </div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex flex-wrap gap-2 mb-6">
          <TabsTrigger value="new">+ New License</TabsTrigger>
          {licensesToShow.map((license) => (
            <TabsTrigger key={license.id} value={license.id}>{license.name || 'Untitled'}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value="new">
          <Card className="w-full bg-card border-primary mb-8">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-primary">Create New License</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={newLicense.name}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="License name"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newLicense.description}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="License description"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="terms">Terms</Label>
                  <Textarea
                    id="terms"
                    value={newLicense.terms}
                    onChange={(e) => setNewLicense(prev => ({ ...prev, terms: e.target.value }))}
                    placeholder="License terms"
                  />
                </div>
                <Button onClick={handleCreate} className="w-fit">
                  <Plus className="mr-2 h-4 w-4" />
                  Create License
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        {licensesToShow.map((license) => (
          <TabsContent key={license.id} value={license.id}>
            <Card className="w-full bg-card border-primary mb-8">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-primary">Edit License: {license.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor={`name-${license.id}`}>Name</Label>
                    <Input
                      id={`name-${license.id}`}
                      value={license.name}
                      onChange={(e) => {
                        // Only allow editing if this is a DB license
                        if (license.created_at) {
                          const updatedLicenses = licenses.map(l =>
                            l.id === license.id ? { ...l, name: e.target.value } : l
                          )
                          setLicenses(updatedLicenses)
                        }
                      }}
                      disabled={!license.created_at}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`description-${license.id}`}>Description</Label>
                    <Textarea
                      id={`description-${license.id}`}
                      value={license.description}
                      onChange={(e) => {
                        if (license.created_at) {
                          const updatedLicenses = licenses.map(l =>
                            l.id === license.id ? { ...l, description: e.target.value } : l
                          )
                          setLicenses(updatedLicenses)
                        }
                      }}
                      disabled={!license.created_at}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor={`terms-${license.id}`}>Terms</Label>
                    <Textarea
                      id={`terms-${license.id}`}
                      value={injectProducerName(license.terms)}
                      onChange={(e) => {
                        if (license.created_at) {
                          const updatedLicenses = licenses.map(l =>
                            l.id === license.id ? { ...l, terms: e.target.value } : l
                          )
                          setLicenses(updatedLicenses)
                        }
                      }}
                      disabled={!license.created_at}
                    />
                  </div>
                  <div className="flex gap-2 mt-2 items-center">
                    {license.created_at && (
                      <>
                        <Button size="sm" onClick={() => handleSave(license)}>
                          <Save className="h-4 w-4" /> Save
                        </Button>
                        <Button size="sm" onClick={() => setEditingLicense(license.id)}>
                          <Edit className="h-4 w-4" /> Edit
                        </Button>
                      </>
                    )}
                    {/* Show Delete button for custom DB licenses only */}
                    {isCustomDbLicense(license) && (
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(license)}>
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
} 