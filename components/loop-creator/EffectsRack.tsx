interface EffectsRackProps {
  onEffectChange: (effect: string, value: number) => void
}

export function EffectsRack({ onEffectChange }: EffectsRackProps) {
  return (
    <div className="bg-secondary p-4 rounded-lg border border-primary">
      <h3 className="text-white font-semibold mb-4">Effects Rack</h3>
      <div className="text-gray-400 text-center py-8">
        <p>Effects Controls Placeholder</p>
        <p className="text-xs mt-2">Feature under development</p>
      </div>
    </div>
  )
} 