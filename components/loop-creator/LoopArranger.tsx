interface LoopArrangerProps {
  arrangedLoops: any[]
  onLoopRemove: (loopId: string) => void
}

export function LoopArranger({ arrangedLoops, onLoopRemove }: LoopArrangerProps) {
  return (
    <div className="bg-secondary p-4 rounded-lg border border-primary mb-4">
      <h3 className="text-white font-semibold mb-4">Loop Arranger</h3>
      <div className="text-gray-400 text-center py-12">
        <p>Loop Arrangement Interface Placeholder</p>
        <p className="text-xs mt-2">Feature under development</p>
      </div>
    </div>
  )
} 