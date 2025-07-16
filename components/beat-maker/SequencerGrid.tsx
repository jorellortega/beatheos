import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Track, SequencerData } from '@/hooks/useBeatMaker'

interface SequencerGridProps {
  tracks: Track[]
  steps: number
  sequencerData: SequencerData
  onToggleStep: (trackId: number, stepIndex: number) => void
  currentStep: number
}

export function SequencerGrid({
  tracks,
  steps,
  sequencerData,
  onToggleStep,
  currentStep
}: SequencerGridProps) {
  return (
    <Card className="!bg-[#141414] border-gray-700">
      <CardHeader>
        <CardTitle className="text-white">Sequencer Grid</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="min-w-max">
            {/* Header row with step numbers */}
            <div className="flex mb-2">
              <div className="w-24 flex-shrink-0"></div> {/* Track name column */}
              {Array.from({ length: steps }, (_, i) => {
                const stepNumber = i + 1
                const isDownbeat = stepNumber % 4 === 1 // Steps 1, 5, 9, 13, etc.
                const isCurrentStep = i === currentStep
                
                return (
                  <div
                    key={i}
                    className={`w-12 h-8 flex items-center justify-center text-xs font-mono border-r ${
                      isDownbeat ? 'border-yellow-500 border-r-2' : 'border-gray-600'
                    } ${
                      isCurrentStep 
                        ? 'bg-[#2a2a2a] text-white border-2 border-white' 
                        : isDownbeat 
                          ? 'bg-yellow-900/30 text-yellow-300 font-bold' 
                          : 'bg-[#1f1f1f] text-gray-300'
                    } ${
                      stepNumber % 4 === 1 && stepNumber !== 1 ? 'ml-1' : ''
                    }`}
                  >
                    {stepNumber}
                  </div>
                )
              })}
            </div>

            {/* Track rows */}
            {tracks.map((track) => (
              <div key={track.id} className="flex mb-3">
                {/* Track name */}
                <div className="w-24 flex-shrink-0 flex items-center px-2 h-8">
                  <div className={`w-3 h-3 rounded-full ${track.color} mr-2`}></div>
                  <span className="text-white text-sm truncate">{track.name}</span>
                </div>

                {/* Step buttons */}
                {Array.from({ length: steps }, (_, stepIndex) => {
                  const isActive = sequencerData[track.id]?.[stepIndex] || false
                  const isCurrentStep = stepIndex === currentStep
                  
                  return (
                    <Button
                      key={stepIndex}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      className={`w-12 h-8 rounded-none border-r border-gray-600 ${
                        isActive ? track.color : 'bg-[#1f1f1f] hover:bg-[#2a2a2a]'
                      } ${
                        isCurrentStep ? 'ring-2 ring-white' : ''
                      }`}
                      onClick={() => onToggleStep(track.id, stepIndex)}
                    >
                      {isActive && (
                        <div className="w-2 h-2 bg-white rounded-full"></div>
                      )}
                    </Button>
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

