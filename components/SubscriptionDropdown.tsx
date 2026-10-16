import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export const subscriptionOptions = [
  { value: "artist_pro", label: "Pro Account: $20/month" },
]

interface SubscriptionDropdownProps {
  onSubscriptionChange: (value: string) => void
  value?: string
}

export function SubscriptionDropdown({ onSubscriptionChange, value }: SubscriptionDropdownProps) {
  const selectValue = typeof value === "string" && value.length > 0 ? value : undefined
  return (
    <Select onValueChange={onSubscriptionChange} value={selectValue}>
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
