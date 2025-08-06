'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { FileText, Save, X } from 'lucide-react'

interface NotesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  itemId: string
  itemType: 'album' | 'single' | 'album_track' | 'track'
  initialNotes?: string
  itemTitle?: string
  onSave: (notes: string) => Promise<void>
}

export function NotesDialog({
  open,
  onOpenChange,
  itemId,
  itemType,
  initialNotes = '',
  itemTitle = '',
  onSave
}: NotesDialogProps) {
  const [notes, setNotes] = useState(initialNotes)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (open) {
      setNotes(initialNotes || '')
    }
  }, [open, initialNotes])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await onSave(notes)
      onOpenChange(false)
    } catch (error) {
      console.error('Error saving notes:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const getItemTypeLabel = () => {
    switch (itemType) {
      case 'album':
        return 'Album'
      case 'single':
        return 'Single'
      case 'album_track':
        return 'Track'
      case 'track':
        return 'Track'
      default:
        return 'Item'
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#1a1a1a] border-gray-700 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {getItemTypeLabel()} Notes
            {itemTitle && (
              <span className="text-gray-400 font-normal">- {itemTitle}</span>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="notes" className="text-white">
              Notes & Comments
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={`Add notes, comments, or reminders for this ${getItemTypeLabel().toLowerCase()}...`}
              className="bg-[#2a2a2a] border-gray-600 text-white min-h-[200px] resize-y"
              rows={8}
            />
            <p className="text-sm text-gray-400 mt-2">
              Use this space for production notes, ideas, reminders, or any other information you want to keep track of.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="bg-black text-white hover:bg-yellow-400 hover:text-black transition-colors flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save Notes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
} 