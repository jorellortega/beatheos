"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { X } from "lucide-react"

interface PurchaseOptionsModalProps {
  isOpen: boolean
  onClose: () => void
  beat: {
    id: number
    title: string
    price: number
  } | null
}

export function PurchaseOptionsModal({ isOpen, onClose, beat }: PurchaseOptionsModalProps) {
  const { toast } = useToast()

  const handlePurchase = () => {
    if (!beat) return
    toast({
      title: "Purchase Successful",
      description: `You have successfully purchased ${beat.title} for $${beat.price}`,
    })
    onClose()
  }

  if (!beat) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-black border-none sm:rounded-lg p-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onClose}
          className="absolute right-4 top-4 text-white hover:text-gray-300"
        >
          <X className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold mb-6">Purchase</h2>
        <div className="space-y-6">
          <div className="text-xl">Price: ${beat.price}</div>
          <Button 
            onClick={handlePurchase} 
            className="w-full bg-[#FFD700] hover:bg-[#FFE55C] text-black font-semibold py-6 text-lg rounded-lg"
          >
            Confirm Purchase
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

