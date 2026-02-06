'use client';

import React, { useState } from 'react';

interface Snapshot {
  id: string;
  timestamp: number;
  label: string;
  artifactCount: number;
  artifacts: Record<string, any>;
}

interface TimeTravelPanelProps {
  onRestore: (artifacts: Record<string, any>) => void;
  currentArtifacts: Record<string, any>;
}

export function TimeTravelPanel({ onRestore, currentArtifacts }: TimeTravelPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [snapshots, setSnapshots] = useState<Snapshot[]>(() => {
    // Initialize with current state as the latest snapshot
    const saved = typeof window !== 'undefined' ? localStorage.getItem('omni_snapshots') : null;
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    return [];
  });
  const [selectedSnapshot, setSelectedSnapshot] = useState<string | null>(null);

  const saveSnapshot = (label?: string) => {
    const newSnapshot: Snapshot = {
      id: `snap_${Date.now()}`,
      timestamp: Date.now(),
      label: label || `Snapshot at ${new Date().toLocaleTimeString()}`,
      artifactCount: Object.keys(currentArtifacts).length,
      artifacts: JSON.parse(JSON.stringify(currentArtifacts)),
    };

    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni_snapshots', JSON.stringify(updated));
    }
  };

  const restoreSnapshot = (snapshot: Snapshot) => {
    onRestore(snapshot.artifacts);
    setSelectedSnapshot(snapshot.id);
    setIsOpen(false);
  };

  const deleteSnapshot = (id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('omni_snapshots', JSON.stringify(updated));
    }
  };

  return (
    <>
      {/* Time Travel Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-40 p-3 rounded-full bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/30 text-teal-200 transition-all duration-200 hover:scale-110 shadow-lg"
        title="Time Travel - View and restore snapshots"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Time Travel Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-96 max-h-96 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-white/10 bg-gradient-to-r from-teal-900/20 to-amber-900/20">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <svg className="w-5 h-5 text-teal-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Time Travel
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-400 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Snapshots List */}
          <div className="overflow-y-auto max-h-[280px] px-4 py-4 space-y-2">
            {snapshots.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-2 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm">No snapshots yet</p>
                <p className="text-xs mt-1 text-gray-600">Save your first snapshot to start time traveling</p>
              </div>
            ) : (
              snapshots.map((snapshot, index) => (
                <div
                  key={snapshot.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    selectedSnapshot === snapshot.id
                      ? 'bg-teal-500/20 border-teal-500/50'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                  }`}
                  onClick={() => restoreSnapshot(snapshot)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2 h-2 rounded-full ${index === 0 ? 'bg-green-400' : 'bg-gray-500'}`} />
                        <p className="text-white text-sm font-medium truncate">{snapshot.label}</p>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(snapshot.timestamp).toLocaleTimeString()} • {snapshot.artifactCount} artifacts
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSnapshot(snapshot.id);
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors flex-shrink-0"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer with Save Button */}
          <div className="px-4 py-3 border-t border-white/10 bg-white/5 flex gap-2">
            <input
              type="text"
              placeholder="Label..."
              id="snapshot-label"
              className="flex-1 px-2 py-1.5 bg-white/5 border border-white/10 rounded text-sm text-white placeholder-gray-600 focus:outline-none focus:border-teal-500/50"
            />
            <button
              onClick={() => {
                const input = document.getElementById('snapshot-label') as HTMLInputElement;
                const label = input?.value || undefined;
                saveSnapshot(label);
                if (input) input.value = '';
              }}
              className="px-3 py-1.5 bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-sm rounded font-medium transition-colors"
            >
              💾 Save
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default TimeTravelPanel;
