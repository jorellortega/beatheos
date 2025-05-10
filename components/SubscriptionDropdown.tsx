import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const subscriptionOptions = [
  { value: "artist_free", label: "Artist: Free" },
  { value: "artist_pro", label: "Pro Artist: $15/month" },
  { value: "producer_free", label: "Producer: Free" },
  { value: "producer_premium", label: "Producer Premium: $12/month" },
  { value: "producer_business", label: "Producer Business: $25/month" },
  { value: "later", label: "I'll choose later" },
]

interface SubscriptionDropdownProps {
  onSubscriptionChange: (value: string) => void
}

export function SubscriptionDropdown({ onSubscriptionChange }: SubscriptionDropdownProps) {
  return (
    <Select onValueChange={onSubscriptionChange}>
      <SelectTrigger className="w-full bg-secondary text-white">
        <SelectValue placeholder="Choose your subscription" />
      </SelectTrigger>
      <SelectContent>
        {subscriptionOptions.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

