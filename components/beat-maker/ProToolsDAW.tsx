'use client';

import React, { useState } from 'react';
import { AudioEngineProvider } from './AudioEngine';
import { ProToolsSequencer } from './ProToolsSequencer';
import { ProToolsEditWindow } from './ProToolsEditWindow';
import { ProToolsMixer } from './ProToolsMixer';
import { ProToolsRecord } from './ProToolsRecord';
import { Button } from '@/components/ui/button';
import { 
  Grid3x3, 
  Edit, 
  Sliders, 
  Mic, 
  Settings,
  Save,
  FolderOpen,
  Plus,
  Layers
} from 'lucide-react';

type DAWView = 'sequencer' | 'edit' | 'mixer' | 'record';

interface ProToolsDAWProps {
  className?: string;
}

export const ProToolsDAW: React.FC<ProToolsDAWProps> = ({ className = '' }) => {
  const [currentView, setCurrentView] = useState<DAWView>('edit');
  const [showSecondaryView, setShowSecondaryView] = useState(false);
  const [secondaryView, setSecondaryView] = useState<DAWView>('mixer');

  const viewConfig = {
    sequencer: {
      title: 'Sequencer',
      icon: Grid3x3,
      component: ProToolsSequencer,
      description: 'Step sequencer for beat programming'
    },
    edit: {
      title: 'Edit Window',
      icon: Edit,
      component: ProToolsEditWindow,
      description: 'ProTools-style multitrack editor'
    },
    mixer: {
      title: 'Mixer',
      icon: Sliders,
      component: ProToolsMixer,
      description: 'Professional mixing console'
    },
    record: {
      title: 'Record',
      icon: Mic,
      component: ProToolsRecord,
      description: 'Recording studio interface'
    }
  };

  const CurrentViewComponent = viewConfig[currentView].component;
  const SecondaryViewComponent = viewConfig[secondaryView].component;

  return (
    <AudioEngineProvider>
      <div className={`bg-slate-950 min-h-screen ${className}`}>
        {/* Top Toolbar */}
        <div className="bg-slate-800 border-b border-slate-700 p-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-xl font-bold text-white">ProTools DAW</h1>
              
              {/* View Selector */}
              <div className="flex bg-slate-900 rounded-lg p-1">
                {(Object.keys(viewConfig) as DAWView[]).map((view) => {
                  const config = viewConfig[view];
                  const Icon = config.icon;
                  return (
                    <Button
                      key={view}
                      variant={currentView === view ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setCurrentView(view)}
                      className="gap-2"
                    >
                      <Icon className="h-4 w-4" />
                      {config.title}
                    </Button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Secondary View Toggle */}
              <Button
                variant={showSecondaryView ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSecondaryView(!showSecondaryView)}
                className="gap-2"
              >
                <Layers className="h-4 w-4" />
                Split View
              </Button>

              {showSecondaryView && (
                <select
                  value={secondaryView}
                  onChange={(e) => setSecondaryView(e.target.value as DAWView)}
                  className="bg-slate-700 text-white px-3 py-2 rounded text-sm"
                >
                  {(Object.keys(viewConfig) as DAWView[])
                    .filter(view => view !== currentView)
                    .map(view => (
                      <option key={view} value={view}>
                        {viewConfig[view].title}
                      </option>
                    ))}
                </select>
              )}

              {/* Project Controls */}
              <div className="flex gap-1 ml-4">
                <Button variant="outline" size="sm">
                  <FolderOpen className="h-4 w-4 mr-1" />
                  Open
                </Button>
                <Button variant="outline" size="sm">
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  New
                </Button>
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* View Description */}
          <div className="mt-2">
            <p className="text-sm text-gray-400">
              {viewConfig[currentView].description}
              {showSecondaryView && ` | ${viewConfig[secondaryView].description}`}
            </p>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          {showSecondaryView ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4 h-[calc(100vh-120px)]">
              {/* Primary View */}
              <div className="bg-slate-900 rounded-lg overflow-hidden">
                <div className="bg-slate-800 px-3 py-2 border-b border-slate-700">
                  <h2 className="text-sm font-semibold text-white">
                    {viewConfig[currentView].title}
                  </h2>
                </div>
                <div className="h-[calc(100%-40px)] overflow-auto">
                  <CurrentViewComponent className="h-full" />
                </div>
              </div>

              {/* Secondary View */}
              <div className="bg-slate-900 rounded-lg overflow-hidden">
                <div className="bg-slate-800 px-3 py-2 border-b border-slate-700">
                  <h2 className="text-sm font-semibold text-white">
                    {viewConfig[secondaryView].title}
                  </h2>
                </div>
                <div className="h-[calc(100%-40px)] overflow-auto">
                  <SecondaryViewComponent className="h-full" />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 h-[calc(100vh-120px)]">
              <CurrentViewComponent className="h-full" />
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="bg-slate-800 border-t border-slate-700 px-4 py-2">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <div className="flex items-center gap-4">
              <span>Ready</span>
              <span>•</span>
              <span>ProTools DAW v1.0</span>
            </div>
            
            <div className="flex items-center gap-4">
              <span>CPU: 12%</span>
              <span>•</span>
              <span>RAM: 2.1GB</span>
              <span>•</span>
              <span>Disk: Free Space Available</span>
            </div>
          </div>
        </div>
      </div>
    </AudioEngineProvider>
  );
};
