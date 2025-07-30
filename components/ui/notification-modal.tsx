import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Info, XCircle } from 'lucide-react'

interface NotificationModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  type?: 'success' | 'error' | 'info' | 'warning'
  showCloseButton?: boolean
}

export function NotificationModal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  showCloseButton = true
}: NotificationModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-6 h-6 text-green-500" />
      case 'error':
        return <XCircle className="w-6 h-6 text-red-500" />
      case 'warning':
        return <AlertCircle className="w-6 h-6 text-yellow-500" />
      default:
        return <Info className="w-6 h-6 text-blue-500" />
    }
  }

  const getTitle = () => {
    if (title) return title
    
    switch (type) {
      case 'success':
        return 'Success'
      case 'error':
        return 'Error'
      case 'warning':
        return 'Warning'
      default:
        return 'Information'
    }
  }

  const getButtonVariant = () => {
    switch (type) {
      case 'success':
        return 'default'
      case 'error':
        return 'destructive'
      case 'warning':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-[#141414] border-gray-700 text-white">
        <DialogHeader className="flex flex-row items-center gap-3">
          {getIcon()}
          <DialogTitle className="text-lg font-semibold text-white">
            {getTitle()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {showCloseButton && (
          <div className="flex justify-end mt-6">
            <Button
              variant={getButtonVariant()}
              onClick={onClose}
              className="min-w-[80px] bg-yellow-500 hover:bg-yellow-600 text-black border-none font-bold"
            >
              Close
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
} 