'use client';

import { useState } from 'react';
import {
  BarChart3,
  ChevronUp,
  ChevronDown,
  Lightbulb,
  FileText,
  Map,
  Activity,
  XCircle,
  FileCode,
  Database,
  Building2,
} from 'lucide-react';

interface FloatingStatsBarProps {
  stats: {
    phase: string;
    tables: number;
    migrations: number;
    tests: { total: number; passing: number; percentage: number };
    behaviors: number;
  };
  projectRoot: string;
}

export default function FloatingStatsBar({ stats, projectRoot }: FloatingStatsBarProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to format VS Code URI correctly for Windows
  const formatVSCodeUri = (filePath: string) => {
    // Convert backslashes to forward slashes and encode spaces
    const normalizedRoot = projectRoot.replace(/\\/g, '/');
    const fullPath = `${normalizedRoot}${filePath}`;
    // URL encode the path (especially spaces)
    const encodedPath = encodeURI(fullPath);
    return `vscode://file/${encodedPath}`;
  };

  const quickLinks = [
    { name: 'Vision', path: '/docs/VISION.md', icon: Lightbulb, color: 'text-yellow-400' },
    { name: 'Product Spec', path: '/docs/planning/PRODUCT_SPEC.md', icon: FileText, color: 'text-blue-400' },
    { name: 'Roadmap', path: '/docs/planning/ROADMAP.md', icon: Map, color: 'text-purple-400' },
    { name: 'Status', path: '/PROJECT_STATUS.md', icon: Activity, color: 'text-green-400' },
    { name: 'Deferred', path: '/docs/planning/DEFERRED_DECISIONS.md', icon: XCircle, color: 'text-orange-400' },
    { name: 'CLAUDE', path: '/CLAUDE.md', icon: FileCode, color: 'text-pink-400' },
    { name: 'Schema', path: '/docs/database/schema-overview.md', icon: Database, color: 'text-cyan-400' },
    { name: 'Architecture', path: '/docs/architecture/ARCHITECTURE.md', icon: Building2, color: 'text-indigo-400' },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-800/95 backdrop-blur-md border border-gray-700 rounded-2xl shadow-2xl">
        {/* Collapsed View - Always Visible */}
        <div
          className="px-6 py-3 cursor-pointer hover:bg-gray-750/50 transition-colors rounded-2xl"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-sm font-semibold text-white">Quick Stats</span>
            </div>

            {/* Inline Stats */}
            <div className="flex items-center gap-5 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Tables:</span>
                <span className="text-white font-bold">{stats.tables}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Migrations:</span>
                <span className="text-white font-bold">{stats.migrations}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Tests:</span>
                <span className="text-green-400 font-bold">{stats.tests.percentage}%</span>
                <span className="text-gray-500 text-xs">({stats.tests.passing}/{stats.tests.total})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-400">Behaviors:</span>
                <span className="text-white font-bold">{stats.behaviors}</span>
              </div>
            </div>

            <div className="w-px h-6 bg-gray-700" />

            {/* Quick Links Icons */}
            <div className="flex items-center gap-2">
              {quickLinks.map((link) => {
                const Icon = link.icon;
                return (
                  <a
                    key={link.path}
                    href={formatVSCodeUri(link.path)}
                    className={`${link.color} hover:scale-110 transition-transform`}
                    title={link.name}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                );
              })}
            </div>

            <button className="text-gray-400 hover:text-white transition-colors ml-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Expanded View - Details */}
        {isExpanded && (
          <div className="border-t border-gray-700 px-6 py-4 bg-gray-850/95 rounded-b-2xl">
            <div className="space-y-4">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-6">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Database Tables</div>
                  <div className="text-3xl font-bold text-white">{stats.tables}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Migrations Applied</div>
                  <div className="text-3xl font-bold text-white">{stats.migrations}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Test Coverage</div>
                  <div className="text-3xl font-bold text-green-400">{stats.tests.percentage}%</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {stats.tests.passing}/{stats.tests.total} passing
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Behaviors Documented</div>
                  <div className="text-3xl font-bold text-white">{stats.behaviors}</div>
                </div>
              </div>

              {/* Quick Links with Labels */}
              <div className="pt-4 border-t border-gray-700">
                <div className="text-xs text-gray-400 mb-2">Quick Links</div>
                <div className="grid grid-cols-4 gap-2">
                  {quickLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <a
                        key={link.path}
                        href={formatVSCodeUri(link.path)}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700 transition-colors text-sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Icon className={`w-4 h-4 ${link.color}`} />
                        <span className="text-gray-300">{link.name}</span>
                      </a>
                    );
                  })}
                </div>
              </div>

              {/* Phase Info */}
              <div className="pt-3 border-t border-gray-700">
                <div className="text-xs text-gray-400">{stats.phase}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
