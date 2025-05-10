"use client"

import * as React from "react"
import { Star } from "lucide-react"

interface RatingProps {
  value: number
  max?: number
  readOnly?: boolean
  onChange: (value: number) => void
}

export function Rating({ value, max = 5, readOnly = false, onChange }: RatingProps) {
  const [hoverValue, setHoverValue] = React.useState<number | null>(null)
  const [showStars, setShowStars] = React.useState(value > 0)

  const stars = Array.from({ length: max }, (_, i) => i + 1)

  const handleClick = (starValue: number) => {
    if (!readOnly && onChange) {
      onChange(starValue)
      setShowStars(true)
    }
  }

  if (!showStars && value === 0) {
    return (
      <button className="text-sm text-muted-foreground hover:text-primary" onClick={() => setShowStars(true)}>
        Not yet rated
      </button>
    )
  }

  return (
    <div className="flex items-center">
      {stars.map((star) => {
        const filled = (hoverValue || value) >= star
        return (
          <button
            key={star}
            type="button"
            className={`p-0.5 cursor-pointer`}
            onClick={() => handleClick(star)}
            onMouseEnter={() => setHoverValue(star)}
            onMouseLeave={() => setHoverValue(null)}
          >
            <Star className={`h-4 w-4 ${filled ? "fill-primary text-primary" : "fill-none text-muted-foreground"}`} />
          </button>
        )
      })}
      {value > 0 && <span className="ml-2 text-sm text-muted-foreground">({value.toFixed(1)})</span>}
    </div>
  )
}

