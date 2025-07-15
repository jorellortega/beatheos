import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const subscriptionOptions = [
  { value: "artist_free", label: "Artist: Free" },
  { value: "artist_pro", label: "Pro Artist: $15/month" },
  { value: "producer_free", label: "Producer: Free" },
  { value: "producer_premium", label: "Producer Premium: $12/month" },
  { value: "producer_business", label: "Producer Business: $25/month" },
]

interface SubscriptionDropdownProps {
  onSubscriptionChange: (value: string) => void
  value?: string
}

export function SubscriptionDropdown({ onSubscriptionChange, value }: SubscriptionDropdownProps) {
  console.log("Dropdown received value:", value)
  // Only pass a string or undefined to value
  const selectValue = typeof value === 'string' && value.length > 0 ? value : undefined
  return (
    <Select onValueChange={onSubscriptionChange} value={selectValue}>
      <SelectTrigger className="w-full bg-secondary text-white">
        <SelectValue placeholder="Choose your subscription" />
      </SelectTrigger>
      <SelectContent>
        {subscriptionOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            disabled={option.value === 'artist_pro' || option.value === 'producer_premium' || option.value === 'producer_free' || option.value === 'producer_business'}
            className={option.value === 'artist_pro' || option.value === 'producer_premium' || option.value === 'producer_free' || option.value === 'producer_business' ? 'opacity-50 pointer-events-none' : ''}
          >
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

