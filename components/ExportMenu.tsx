'use client';

import React, { useState } from 'react';
import type { Artifact } from '@/lib/artifacts/types';
import { exportAsJSON, exportAsMarkdown, exportAsCSV, downloadFile, copyToClipboard } from '@/lib/export';

interface ExportMenuProps {
  artifacts: Record<string, Artifact>;
  onExport?: (type: 'json' | 'markdown' | 'csv' | 'copy') => void;
}

export function ExportMenu({ artifacts, onExport }: ExportMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExportJSON = () => {
    const content = exportAsJSON(artifacts);
    downloadFile(content, `workspace-${Date.now()}.json`, 'application/json');
    setIsOpen(false);
    onExport?.('json');
  };

  const handleExportMarkdown = () => {
    const content = exportAsMarkdown(artifacts);
    downloadFile(content, `workspace-${Date.now()}.md`, 'text/markdown');
    setIsOpen(false);
    onExport?.('markdown');
  };

  const handleExportCSV = () => {
    const content = exportAsCSV(artifacts);
    downloadFile(content, `workspace-${Date.now()}.csv`, 'text/csv');
    setIsOpen(false);
    onExport?.('csv');
  };

  const handleCopyJSON = () => {
    const content = exportAsJSON(artifacts);
    copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onExport?.('copy');
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 text-sm transition-colors"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl z-50 overflow-hidden">
          <div className="p-3 border-b border-zinc-700">
            <p className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">Export Format</p>
          </div>

          <button
            onClick={handleExportJSON}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-zinc-800 transition-colors flex items-center gap-3"
          >
            <span className="text-lg">📄</span>
            <div>
              <div className="font-semibold">JSON</div>
              <div className="text-xs text-gray-500">For reimport or integration</div>
            </div>
          </button>

          <button
            onClick={handleExportMarkdown}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-zinc-800 transition-colors flex items-center gap-3 border-t border-zinc-800"
          >
            <span className="text-lg">📝</span>
            <div>
              <div className="font-semibold">Markdown</div>
              <div className="text-xs text-gray-500">For documentation</div>
            </div>
          </button>

          <button
            onClick={handleExportCSV}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-zinc-800 transition-colors flex items-center gap-3 border-t border-zinc-800"
          >
            <span className="text-lg">📊</span>
            <div>
              <div className="font-semibold">CSV</div>
              <div className="text-xs text-gray-500">For Excel or Sheets</div>
            </div>
          </button>

          <button
            onClick={handleCopyJSON}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-zinc-800 transition-colors flex items-center gap-3 border-t border-zinc-800"
          >
            <span className="text-lg">{copied ? '✓' : '📋'}</span>
            <div>
              <div className="font-semibold">Copy JSON</div>
              <div className="text-xs text-gray-500">{copied ? 'Copied!' : 'To clipboard'}</div>
            </div>
          </button>

          <button
            onClick={() => setIsOpen(false)}
            className="w-full px-4 py-2.5 text-left text-sm text-gray-500 hover:bg-zinc-800 transition-colors border-t border-zinc-800"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
