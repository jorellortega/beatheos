import { useState, useEffect } from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { supabase } from "@/lib/supabaseClient"
import { useAuth } from '@/contexts/AuthContext'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface License {
  id: string
  name: string
  description: string
  terms: string
  is_exclusive: boolean
  is_buyout: boolean
  created_at?: string
  updated_at?: string
}

interface LicensingOptionsProps {
  licensing: Record<string, number>
  setLicensing: (licensing: Record<string, number>) => void
}

// Import the license templates (copy from your SuccessContent.tsx or shared location)
const LEASE_TERMS = `Non-exclusive license for limited commercial use.`
const PREMIUM_LEASE_TERMS = `Non-exclusive license for broader commercial use.`
const EXCLUSIVE_TERMS = `Exclusive rights—once purchased, the beat is removed from the marketplace.`
const BUYOUT_TERMS = `Full ownership transfer—buyer gains complete ownership, including resale rights.`

// Default license templates
const DEFAULT_LICENSES_META = [
  { name: 'Lease', is_exclusive: false, is_buyout: false, description: 'Non-exclusive license for limited commercial use', terms: LEASE_TERMS },
  { name: 'Premium Lease', is_exclusive: false, is_buyout: false, description: 'Non-exclusive license for broader commercial use', terms: PREMIUM_LEASE_TERMS },
  { name: 'Exclusive', is_exclusive: true, is_buyout: false, description: 'Exclusive rights—once purchased, the beat is removed from the marketplace', terms: EXCLUSIVE_TERMS },
  { name: 'Buy Out', is_exclusive: false, is_buyout: true, description: 'Full ownership transfer—buyer gains complete ownership, including resale rights', terms: BUYOUT_TERMS },
]

const DEFAULT_LICENSES_PRICES = {
  'Lease': 20.00,
  'Premium Lease': 100.00,
  'Exclusive': 300.00,
  'Buy Out': 1000.00
}

export function LicensingOptions({ licensing, setLicensing }: LicensingOptionsProps) {
  const [licenses, setLicenses] = useState<License[]>([])
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>(Object.keys(licensing))
  const [licensePDFs, setLicensePDFs] = useState<Record<string, File | null>>({})
  const [loading, setLoading] = useState(true)
  const { user } = useAuth();
  const [expandedLicense, setExpandedLicense] = useState<string | null>(null)

  // Helper to inject producer name if needed (not used in short desc, but for full terms)
  function injectProducerName(terms: string) {
    const producerName = user?.email?.split('@')[0] || "Producer";
    return terms.replace(/\[Your Name \/ Producer Name\]/g, producerName)
  }

  useEffect(() => {
    async function fetchLicenses() {
      try {
        const { data, error } = await supabase
          .from('licenses')
          .select('*')
          .order('name')
        if (error) throw error
        setLicenses(data || [])
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to load license types",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }
    fetchLicenses()
    // Always select all default licenses on mount
    const defaultIds = DEFAULT_LICENSES_META.map(meta => `template-${meta.name.toLowerCase().replace(/ /g, '-')}`)
    setSelectedLicenses(defaultIds)
    // Set default licensing prices
    const initialLicensing: Record<string, number> = {}
    DEFAULT_LICENSES_META.forEach(meta => {
      initialLicensing[`template-${meta.name.toLowerCase().replace(/ /g, '-')}`] = DEFAULT_LICENSES_PRICES[meta.name as keyof typeof DEFAULT_LICENSES_PRICES]
    })
    setLicensing(initialLicensing)
  }, [])

  // Merge DB licenses with default templates
  const mergedLicenses: License[] = DEFAULT_LICENSES_META.map(meta => {
    const found = licenses.find(l => l.name === meta.name)
    return found || {
      id: `template-${meta.name.toLowerCase().replace(/ /g, '-')}`,
      name: meta.name,
      description: meta.description,
      terms: injectProducerName(meta.terms),
      is_exclusive: meta.is_exclusive,
      is_buyout: meta.is_buyout,
    }
  })
  // Add any custom licenses (not one of the four defaults)
  const customLicenses = licenses.filter(l => !DEFAULT_LICENSES_META.some(meta => meta.name === l.name))
  const licensesToShow = [...mergedLicenses, ...customLicenses]

  // When a user sets a price for a template license, insert it into the DB
  const handlePriceChange = async (licenseId: string, price: string) => {
    const license = licensesToShow.find(l => l.id === licenseId)
    if (!license) return
    // If it's a template (not in DB), insert it
    if (licenseId.startsWith('template-')) {
      try {
        const { data, error } = await supabase.from('licenses').insert([{
          name: license.name,
          description: license.description,
          terms: license.terms,
          is_exclusive: license.is_exclusive,
          is_buyout: license.is_buyout,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]).select()
        if (error) throw error
        // Replace the template with the DB version
        setLicenses(prev => [...prev, ...(data || [])])
        // Update selectedLicenses and licensing with new DB id
        const newId = data?.[0]?.id
        if (newId) {
          setSelectedLicenses(prev => prev.map(id => id === licenseId ? newId : id))
          // Fix: use a temp object instead of updater function
          const newLicensing = { ...licensing }
          delete newLicensing[licenseId]
          newLicensing[newId] = parseFloat(price) || 0
          setLicensing(newLicensing)
        }
      } catch (err: any) {
        toast({ title: 'Error', description: err.message || 'Failed to create license', variant: 'destructive' })
      }
    } else {
      setLicensing({ ...licensing, [licenseId]: parseFloat(price) || 0 })
    }
  }

  const handleLicenseChange = (licenseId: string) => {
    // Prevent unchecking default licenses
    if (DEFAULT_LICENSES_META.some(meta => `template-${meta.name.toLowerCase().replace(/ /g, '-')}` === licenseId) ||
        DEFAULT_LICENSES_META.some(meta => licenses.find(l => l.id === licenseId && l.name === meta.name))) {
      // Do nothing, always checked
      return;
    }
    setSelectedLicenses(prev =>
      prev.includes(licenseId)
        ? prev.filter(id => id !== licenseId)
        : [...prev, licenseId]
    )
    if (!licensing[licenseId]) {
      setLicensing({ ...licensing, [licenseId]: DEFAULT_LICENSES_PRICES[licensesToShow.find(l => l.id === licenseId)?.name as keyof typeof DEFAULT_LICENSES_PRICES] || 0 })
    } else {
      const { [licenseId]: _, ...rest } = licensing
      setLicensing(rest)
    }
  }

  const handlePDFUpload = (licenseId: string, file: File | null) => {
    if (!file) return
    if (file.type !== 'application/pdf') {
      toast({ title: "Invalid File Type", description: "Please upload a PDF file", variant: "destructive" })
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File Too Large", description: "PDF file must be less than 5MB", variant: "destructive" })
      return
    }
    setLicensePDFs(prev => ({ ...prev, [licenseId]: file }))
    toast({ title: "PDF Uploaded", description: `Custom license PDF uploaded for ${licensesToShow.find(l => l.id === licenseId)?.name}` })
  }

  if (loading) {
    return <div>Loading license options...</div>
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Licensing Options</h2>
      <div className="space-y-2">
        {licensesToShow.map(license => {
          const isDefaultLicense = DEFAULT_LICENSES_META.some(meta => meta.name === license.name)
          const isExpanded = expandedLicense === license.id
          return (
            <div
              key={license.id}
              className={`transition-all duration-200 border rounded-lg bg-card/80 ${isExpanded ? 'shadow-lg border-primary' : 'border-muted'} cursor-pointer`}
              onClick={() => setExpandedLicense(isExpanded ? null : license.id)}
            >
              <div className="flex items-center px-4 py-3 gap-3">
            <Checkbox
              id={license.id}
              checked={selectedLicenses.includes(license.id)}
              onCheckedChange={() => handleLicenseChange(license.id)}
                  className="mt-0.5"
                  disabled
            />
                <div className="flex-1 flex items-center gap-2">
                  <Label htmlFor={license.id} className="text-lg font-semibold">
                    {license.name}
                    {isDefaultLicense && <span className="ml-2 text-sm text-primary">(Default)</span>}
                  </Label>
                  <span className="ml-2 text-muted-foreground text-base font-mono">${licensing[license.id] || ''}</span>
                </div>
                <button type="button" className="ml-auto p-1 text-muted-foreground" tabIndex={-1}>
                  {isExpanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                </button>
              </div>
              {isExpanded && (
                <div className="px-6 pb-4 pt-0 animate-fade-in">
                  <p className="text-gray-400 mb-2">{license.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Price"
                    value={licensing[license.id] || ''}
                    onChange={(e) => handlePriceChange(license.id, e.target.value)}
                    className="w-32"
                  />
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

