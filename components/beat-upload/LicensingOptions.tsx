import { useState } from 'react'
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { Upload } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

const licenseTypes = [
  { id: 'lease', name: 'Lease License', description: 'Non-exclusive license for limited commercial use' },
  { id: 'premium', name: 'Premium Lease License', description: 'Non-exclusive license for broader commercial use' },
  { id: 'exclusive', name: 'Exclusive License', description: 'Exclusive rights—once purchased, the beat is removed from the marketplace' },
  { id: 'buyout', name: 'Buy Out License', description: 'Full ownership transfer—buyer gains complete ownership, including resale rights' },
]

interface LicensingOptionsProps {
  licensing: Record<string, number>
  setLicensing: (licensing: Record<string, number>) => void
}

export function LicensingOptions({ licensing, setLicensing }: LicensingOptionsProps) {
  const [selectedLicenses, setSelectedLicenses] = useState<string[]>(Object.keys(licensing))
  const [licensePDFs, setLicensePDFs] = useState<Record<string, File | null>>({})

  const handleLicenseChange = (licenseId: string) => {
    setSelectedLicenses(prev =>
      prev.includes(licenseId)
        ? prev.filter(id => id !== licenseId)
        : [...prev, licenseId]
    )
    if (!licensing[licenseId]) {
      setLicensing({ ...licensing, [licenseId]: 0 })
    } else {
      const { [licenseId]: _, ...rest } = licensing
      setLicensing(rest)
    }
  }

  const handlePriceChange = (licenseId: string, price: string) => {
    setLicensing({ ...licensing, [licenseId]: parseFloat(price) || 0 })
  }

  const handlePDFUpload = (licenseId: string, file: File | null) => {
    if (!file) return
    
    // Check if the file is a PDF
    if (file.type !== 'application/pdf') {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF file",
        variant: "destructive",
      })
      return
    }

    // Check file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "PDF file must be less than 5MB",
        variant: "destructive",
      })
      return
    }

    setLicensePDFs(prev => ({ ...prev, [licenseId]: file }))
    toast({
      title: "PDF Uploaded",
      description: `Custom license PDF uploaded for ${licenseTypes.find(l => l.id === licenseId)?.name}`,
    })
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Licensing Options</h2>
      <div className="space-y-6">
        {licenseTypes.map(license => (
          <div key={license.id} className="flex items-start space-x-4">
            <Checkbox
              id={license.id}
              checked={selectedLicenses.includes(license.id)}
              onCheckedChange={() => handleLicenseChange(license.id)}
              className="mt-1.5"
            />
            <div className="grid gap-2 flex-grow">
              <Label htmlFor={license.id} className="text-xl font-semibold">{license.name}</Label>
              <p className="text-gray-400">{license.description}</p>
              {selectedLicenses.includes(license.id) && (
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Price"
                    value={licensing[license.id] || ''}
                    onChange={(e) => handlePriceChange(license.id, e.target.value)}
                    className="w-32"
                  />
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={(e) => handlePDFUpload(license.id, e.target.files?.[0] || null)}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      title="Upload custom license PDF"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className={licensePDFs[license.id] ? "bg-primary/10" : ""}
                      title={licensePDFs[license.id] ? "Replace PDF" : "Upload custom license PDF"}
                    >
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

