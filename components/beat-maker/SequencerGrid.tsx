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
              {Array.from({ length: steps }, (_, i) => (
                <div
                  key={i}
                  className={`w-12 h-8 flex items-center justify-center text-xs font-mono border-r border-gray-600 ${
                    i === currentStep ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                  }`}
                >
                  {i + 1}
                </div>
              ))}
            </div>

            {/* Track rows */}
            {tracks.map((track) => (
              <div key={track.id} className="flex mb-1">
                {/* Track name */}
                <div className="w-24 flex-shrink-0 flex items-center px-2">
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
                        isActive ? track.color : 'bg-gray-800 hover:bg-gray-700'
                      } ${
                        isCurrentStep ? 'ring-2 ring-blue-400' : ''
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

