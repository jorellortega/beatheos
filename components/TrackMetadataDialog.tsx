'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Calendar, FileText, Music, Users, Copyright, CalendarDays, Building, Barcode, Globe, MapPin, Mic, Settings, Shield, AlertTriangle } from 'lucide-react'

interface TrackMetadata {
  distributor?: string
  deadline_to_distribute?: string
  performing_artists?: string
  producers?: string
  engineers?: string
  copyright_info?: string
  songwriter?: string
  release_date?: string
  label?: string
  upc?: string
  primary_genre?: string
  language?: string
  release_id?: string
  isrc?: string
  recording_location?: string
  mix_engineer?: string
  mastering_engineer?: string
  publishing_rights?: string
  mechanical_rights?: string
  territory?: string
  explicit_content?: boolean
  parental_advisory?: boolean
}

interface TrackMetadataDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trackId: string
  trackType: 'single' | 'album_track'
  initialMetadata?: TrackMetadata
  onSave: (metadata: TrackMetadata) => Promise<void>
}

const GENRES = [
  'Hip Hop/Rap', 'Pop', 'Rock', 'R&B/Soul', 'Electronic', 'Country', 'Jazz', 'Classical', 'Reggae', 'Blues',
  'Folk', 'Alternative', 'Indie', 'Metal', 'Punk', 'Funk', 'Disco', 'House', 'Techno', 'Trap', 'Drill',
  'Afrobeats', 'Latin', 'K-Pop', 'J-Pop', 'Gospel', 'Christian', 'World', 'Soundtrack', 'Comedy', 'Other'
]

const LANGUAGES = [
  'English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Russian', 'Chinese', 'Japanese', 'Korean',
  'Arabic', 'Hindi', 'Swedish', 'Norwegian', 'Danish', 'Dutch', 'Polish', 'Turkish', 'Greek', 'Hebrew',
  'Thai', 'Vietnamese', 'Indonesian', 'Malay', 'Filipino', 'Other'
]

const TERRITORIES = [
  'Worldwide', 'United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands',
  'Belgium', 'Switzerland', 'Austria', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Poland', 'Czech Republic',
  'Hungary', 'Romania', 'Bulgaria', 'Greece', 'Turkey', 'Russia', 'Ukraine', 'Belarus', 'Kazakhstan',
  'Japan', 'South Korea', 'China', 'Taiwan', 'Hong Kong', 'Singapore', 'Malaysia', 'Thailand', 'Vietnam',
  'Philippines', 'Indonesia', 'Australia', 'New Zealand', 'Brazil', 'Argentina', 'Chile', 'Colombia',
  'Mexico', 'Peru', 'Venezuela', 'South Africa', 'Nigeria', 'Kenya', 'Ghana', 'Egypt', 'Morocco', 'Other'
]

export function TrackMetadataDialog({
  open,
  onOpenChange,
  trackId,
  trackType,
  initialMetadata = {},
  onSave
}: TrackMetadataDialogProps) {
  const [metadata, setMetadata] = useState<TrackMetadata>(initialMetadata || {})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setMetadata(initialMetadata || {})
    }
  }, [open, initialMetadata])

  // Safety check - ensure metadata is never null
  const safeMetadata = metadata || {}

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(safeMetadata)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving metadata:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const updateField = (field: keyof TrackMetadata, value: any) => {
    setMetadata(prev => ({ ...(prev || {}), [field]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Track Metadata
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribution Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
              <Building className="w-4 h-4" />
              Distribution
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="distributor" className="text-white">Distributor</Label>
                                  <Input
                    id="distributor"
                    value={safeMetadata.distributor || ''}
                    onChange={(e) => updateField('distributor', e.target.value)}
                    placeholder="e.g., DistroKid, TuneCore, CD Baby"
                    className="bg-[#2a2a2a] border-gray-600 text-white"
                  />
              </div>
              
              <div>
                <Label htmlFor="deadline" className="text-white">Deadline to Distribute</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={metadata.deadline_to_distribute || ''}
                  onChange={(e) => updateField('deadline_to_distribute', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="territory" className="text-white">Territory</Label>
                <Select value={metadata.territory || ''} onValueChange={(value) => updateField('territory', value)}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue placeholder="Select territory" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-600">
                    {TERRITORIES.map(territory => (
                      <SelectItem key={territory} value={territory}>{territory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Release Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Release Info
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="release_date" className="text-white">Release Date</Label>
                <Input
                  id="release_date"
                  type="date"
                  value={metadata.release_date || ''}
                  onChange={(e) => updateField('release_date', e.target.value)}
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="label" className="text-white">Label</Label>
                <Input
                  id="label"
                  value={metadata.label || ''}
                  onChange={(e) => updateField('label', e.target.value)}
                  placeholder="Record label name"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="upc" className="text-white">UPC</Label>
                <Input
                  id="upc"
                  value={metadata.upc || ''}
                  onChange={(e) => updateField('upc', e.target.value)}
                  placeholder="Universal Product Code"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="isrc" className="text-white">ISRC</Label>
                <Input
                  id="isrc"
                  value={metadata.isrc || ''}
                  onChange={(e) => updateField('isrc', e.target.value)}
                  placeholder="International Standard Recording Code"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="release_id" className="text-white">Release ID</Label>
                <Input
                  id="release_id"
                  value={metadata.release_id || ''}
                  onChange={(e) => updateField('release_id', e.target.value)}
                  placeholder="Platform release identifier"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Credits Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Credits
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="performing_artists" className="text-white">Performing Artists</Label>
                <Textarea
                  id="performing_artists"
                  value={metadata.performing_artists || ''}
                  onChange={(e) => updateField('performing_artists', e.target.value)}
                  placeholder="Comma-separated list of performing artists"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="producers" className="text-white">Producers</Label>
                <Textarea
                  id="producers"
                  value={metadata.producers || ''}
                  onChange={(e) => updateField('producers', e.target.value)}
                  placeholder="Comma-separated list of producers"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="songwriter" className="text-white">Songwriter</Label>
                <Textarea
                  id="songwriter"
                  value={metadata.songwriter || ''}
                  onChange={(e) => updateField('songwriter', e.target.value)}
                  placeholder="Comma-separated list of songwriters"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="engineers" className="text-white">Engineers</Label>
                <Textarea
                  id="engineers"
                  value={metadata.engineers || ''}
                  onChange={(e) => updateField('engineers', e.target.value)}
                  placeholder="Comma-separated list of engineers"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="mix_engineer" className="text-white">Mix Engineer</Label>
                <Input
                  id="mix_engineer"
                  value={metadata.mix_engineer || ''}
                  onChange={(e) => updateField('mix_engineer', e.target.value)}
                  placeholder="Mix engineer name"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="mastering_engineer" className="text-white">Mastering Engineer</Label>
                <Input
                  id="mastering_engineer"
                  value={metadata.mastering_engineer || ''}
                  onChange={(e) => updateField('mastering_engineer', e.target.value)}
                  placeholder="Mastering engineer name"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
          </div>

          {/* Classification & Rights */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Classification & Rights
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="primary_genre" className="text-white">Primary Genre</Label>
                <Select value={metadata.primary_genre || ''} onValueChange={(value) => updateField('primary_genre', value)}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue placeholder="Select genre" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-600">
                    {GENRES.map(genre => (
                      <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="language" className="text-white">Language</Label>
                <Select value={metadata.language || ''} onValueChange={(value) => updateField('language', value)}>
                  <SelectTrigger className="bg-[#2a2a2a] border-gray-600 text-white">
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#2a2a2a] border-gray-600">
                    {LANGUAGES.map(language => (
                      <SelectItem key={language} value={language}>{language}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="copyright_info" className="text-white">Copyright Info</Label>
                <Input
                  id="copyright_info"
                  value={metadata.copyright_info || ''}
                  onChange={(e) => updateField('copyright_info', e.target.value)}
                  placeholder="e.g., © 2024 Artist Name"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
              
              <div>
                <Label htmlFor="publishing_rights" className="text-white">Publishing Rights</Label>
                <Textarea
                  id="publishing_rights"
                  value={metadata.publishing_rights || ''}
                  onChange={(e) => updateField('publishing_rights', e.target.value)}
                  placeholder="Publishing rights information"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  rows={2}
                />
              </div>
              
              <div>
                <Label htmlFor="mechanical_rights" className="text-white">Mechanical Rights</Label>
                <Textarea
                  id="mechanical_rights"
                  value={metadata.mechanical_rights || ''}
                  onChange={(e) => updateField('mechanical_rights', e.target.value)}
                  placeholder="Mechanical rights information"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                  rows={2}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="explicit_content"
                    checked={metadata.explicit_content || false}
                    onCheckedChange={(checked) => updateField('explicit_content', checked)}
                  />
                  <Label htmlFor="explicit_content" className="text-white">Explicit Content</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="parental_advisory"
                    checked={metadata.parental_advisory || false}
                    onCheckedChange={(checked) => updateField('parental_advisory', checked)}
                  />
                  <Label htmlFor="parental_advisory" className="text-white">Parental Advisory Required</Label>
                </div>
              </div>
            </div>
          </div>

          {/* Recording Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Recording Info
            </h3>
            
            <div className="space-y-3">
              <div>
                <Label htmlFor="recording_location" className="text-white">Recording Location</Label>
                <Input
                  id="recording_location"
                  value={metadata.recording_location || ''}
                  onChange={(e) => updateField('recording_location', e.target.value)}
                  placeholder="e.g., Studio Name, City, Country"
                  className="bg-[#2a2a2a] border-gray-600 text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-black text-white hover:bg-yellow-400 hover:text-black transition-colors"
          >
            {isSaving ? 'Saving...' : 'Save Metadata'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 