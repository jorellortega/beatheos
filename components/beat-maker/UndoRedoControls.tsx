'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { 
  RotateCcw, 
  RotateCw, 
  History, 
  Save, 
  Clock, 
  Trash2,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import { useUndoRedo, BeatMakerState, VersionHistoryEntry } from '@/hooks/useUndoRedo'

interface UndoRedoControlsProps {
  undoRedo: ReturnType<typeof useUndoRedo>
  currentState: BeatMakerState
  onStateRestore: (state: BeatMakerState) => void
  className?: string
}

export function UndoRedoControls({ 
  undoRedo, 
  currentState, 
  onStateRestore, 
  className = '' 
}: UndoRedoControlsProps) {
  const [showHistory, setShowHistory] = useState(false)
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [versionName, setVersionName] = useState('')
  const [versionDescription, setVersionDescription] = useState('')

  const {
    undo,
    redo,
    canUndo,
    canRedo,
    saveVersion,
    clearHistory,
    getHistorySummary,
    getStackInfo
  } = undoRedo

  const handleUndo = () => {
    const previousState = undo()
    if (previousState) {
      onStateRestore(previousState)
    }
  }

  const handleRedo = () => {
    const nextState = redo()
    if (nextState) {
      onStateRestore(nextState)
    }
  }

  const handleSaveVersion = () => {
    if (versionName.trim()) {
      saveVersion(currentState, versionName.trim(), versionDescription.trim())
      setVersionName('')
      setVersionDescription('')
      setShowSaveDialog(false)
    }
  }

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all version history? This cannot be undone.')) {
      clearHistory()
    }
  }

  const historySummary = getHistorySummary()
  const stackInfo = getStackInfo()

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <TooltipProvider>
        {/* Undo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              className="h-8 w-8 p-0"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Undo (Ctrl+Z)</p>
            {canUndo && <p className="text-xs text-muted-foreground">{stackInfo.undoCount} steps back</p>}
          </TooltipContent>
        </Tooltip>

        {/* Redo Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRedo}
              disabled={!canRedo}
              className="h-8 w-8 p-0"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Redo (Ctrl+Y)</p>
            {canRedo && <p className="text-xs text-muted-foreground">{stackInfo.redoCount} steps forward</p>}
          </TooltipContent>
        </Tooltip>

        {/* History Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHistory(true)}
              className="h-8 px-3"
            >
              <History className="h-4 w-4 mr-1" />
              <span className="text-xs">{stackInfo.totalVersions}</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Version History</p>
            <p className="text-xs text-muted-foreground">{stackInfo.totalVersions} versions</p>
          </TooltipContent>
        </Tooltip>

        {/* Save Version Button */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              className="h-8 px-3"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Save Current Version</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Version History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
              <Badge variant="secondary" className="ml-auto">
                {stackInfo.totalVersions} versions
              </Badge>
            </DialogTitle>
            <DialogDescription>
              Browse and restore previous versions of your beat
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">
              {stackInfo.canUndo && `${stackInfo.undoCount} steps back`}
              {stackInfo.canRedo && ` • ${stackInfo.redoCount} steps forward`}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearHistory}
              className="h-8 px-2"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {historySummary.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No version history yet</p>
                  <p className="text-xs">Start making changes to see versions here</p>
                </div>
              ) : (
                historySummary.map((version, index) => (
                  <Card
                    key={version.id}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      version.isCurrent ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => {
                      const restoredState = undoRedo.jumpToVersion(version.id)
                      if (restoredState) {
                        onStateRestore(restoredState)
                      }
                      setShowHistory(false)
                    }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{version.name}</h4>
                            {version.isCurrent && (
                              <Badge variant="default" className="text-xs">
                                Current
                              </Badge>
                            )}
                            {version.isAutoSave && (
                              <Badge variant="secondary" className="text-xs">
                                Auto
                              </Badge>
                            )}
                          </div>
                          {version.description && (
                            <p className="text-sm text-muted-foreground mb-2">
                              {version.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>{new Date(version.timestamp).toLocaleString()}</span>
                            <span>Version {index + 1}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          {version.isCurrent && (
                            <ChevronLeft className="h-4 w-4 text-primary" />
                          )}
                          {index < historySummary.length - 1 && !version.isCurrent && (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistory(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Version Dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current Version</DialogTitle>
            <DialogDescription>
              Save the current state as a named version for easy access later
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Version Name</label>
              <input
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder="e.g., 'Drum Pattern v1', 'Final Mix'"
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description (Optional)</label>
              <textarea
                value={versionDescription}
                onChange={(e) => setVersionDescription(e.target.value)}
                placeholder="Describe what this version contains..."
                className="w-full mt-1 px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveVersion}
              disabled={!versionName.trim()}
            >
              Save Version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
} 