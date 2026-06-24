'use client';

import { useState } from 'react';
import { ChevronDown, Maximize2, Minimize2 } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  maxHeight?: string;
}

export default function DashboardCard({
  title,
  icon,
  badge,
  children,
  defaultExpanded = false,
  maxHeight = '250px',
}: DashboardCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
      {/* Compact Card Header */}
      <div className="px-4 py-2 border-b border-gray-700 flex items-center justify-between bg-gray-850">
        <div className="flex items-center gap-2">
          {icon && <span className="text-blue-400">{icon}</span>}
          <h2 className="text-sm font-semibold text-white">{title}</h2>
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 text-[10px] font-medium bg-blue-500/20 text-blue-300 rounded-full">
              {badge}
            </span>
          )}
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-700 rounded"
          title={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? (
            <Minimize2 className="w-3.5 h-3.5" />
          ) : (
            <Maximize2 className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* Compact Card Content */}
      <div
        className={`transition-all duration-300 text-sm ${
          isExpanded ? '' : 'overflow-y-auto'
        }`}
        style={{
          maxHeight: isExpanded ? 'none' : maxHeight,
        }}
      >
        <div className="px-4 py-3">{children}</div>
      </div>

      {/* Compact scroll indicator */}
      {!isExpanded && (
        <div className="px-4 pb-2 pt-0">
          <div className="flex items-center justify-center gap-1.5 text-[10px] text-gray-500">
            <ChevronDown className="w-2.5 h-2.5" />
            <span>Scroll or expand</span>
          </div>
        </div>
      )}
    </div>
  );
}
