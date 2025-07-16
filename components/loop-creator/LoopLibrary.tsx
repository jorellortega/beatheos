interface LoopLibraryProps {
  loops: any[]
  onLoopSelect: (loopId: string) => void
  onAddLoop: (loop: any) => void
}

export function LoopLibrary({ loops, onLoopSelect, onAddLoop }: LoopLibraryProps) {
  return (
    <div className="bg-secondary p-4 rounded-lg border border-primary">
      <h3 className="text-white font-semibold mb-4">Loop Library</h3>
      <div className="text-gray-400 text-center py-8">
        <p>Loop Library Placeholder</p>
        <p className="text-xs mt-2">Feature under development</p>
      </div>
    </div>
  )
} 