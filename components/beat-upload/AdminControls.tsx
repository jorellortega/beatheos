import { useState } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { toast } from "@/components/ui/use-toast"

export function AdminControls() {
  const [isTop10, setIsTop10] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [discountPercentage, setDiscountPercentage] = useState('')

  const handlePromoCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement promo code logic
    console.log('Promo code:', promoCode, 'Discount:', discountPercentage)
    toast({
      title: "Promo Code Added",
      description: `Promo code ${promoCode} with ${discountPercentage}% discount has been added.`,
    })
    setPromoCode('')
    setDiscountPercentage('')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Switch
          id="top10"
          checked={isTop10}
          onCheckedChange={setIsTop10}
        />
        <Label htmlFor="top10">Promote to Top 10</Label>
      </div>

      <form onSubmit={handlePromoCodeSubmit} className="space-y-4">
        <div>
          <Label htmlFor="promoCode">Promo Code</Label>
          <Input
            id="promoCode"
            value={promoCode}
            onChange={(e) => setPromoCode(e.target.value)}
            className="bg-secondary text-white"
          />
        </div>
        <div>
          <Label htmlFor="discountPercentage">Discount Percentage</Label>
          <Input
            id="discountPercentage"
            type="number"
            value={discountPercentage}
            onChange={(e) => setDiscountPercentage(e.target.value)}
            className="bg-secondary text-white"
          />
        </div>
        <Button type="submit">Add Promo Code</Button>
      </form>

      <div>
        <Button variant="destructive">Delete Beat</Button>
      </div>
    </div>
  )
}

