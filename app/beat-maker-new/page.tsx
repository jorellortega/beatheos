'use client';

import React from 'react';
import { PlayerProvider } from '@/contexts/PlayerContext';
import { ProToolsDAW } from '@/components/beat-maker/ProToolsDAW';

export default function BeatMakerNewPage() {
  return (
    <PlayerProvider>
      <div className="min-h-screen bg-slate-950">
        <ProToolsDAW />
      </div>
    </PlayerProvider>
  );
}
