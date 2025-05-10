import { useState } from 'react'
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { X } from 'lucide-react'

interface TagInputProps {
  tags: string[]
  setTags: (tags: string[]) => void
}

export function TagInput({ tags, setTags }: TagInputProps) {
  const [input, setInput] = useState('')

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && input) {
      e.preventDefault()
      if (!tags.includes(input.toLowerCase())) {
        setTags([...tags, input.toLowerCase()])
        setInput('')
      }
    }
  }

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  return (
    <div>
      <Label htmlFor="tags">Tags/Keywords</Label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map(tag => (
          <Badge key={tag} variant="secondary" className="text-sm">
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="ml-2 text-gray-500 hover:text-gray-700"
            >
              <X size={14} />
            </button>
          </Badge>
        ))}
      </div>
      <Input
        id="tags"
        value={input}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        placeholder="Add tags (press Enter to add)"
        className="bg-secondary text-white"
      />
    </div>
  )
}

