'use client';

interface AdminStatCardProps {
  title: string;
  value: number | null;
  icon: string;
  loading: boolean;
  selected?: boolean;
  onClick?: () => void;
}

export default function AdminStatCard({ title, value, icon, loading, selected, onClick }: AdminStatCardProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white rounded-xl shadow-sm border p-6 transition-all ${
        selected
          ? 'border-blue-500 ring-2 ring-blue-200'
          : 'border-gray-200 hover:border-blue-300 hover:shadow-md'
      } ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center gap-4">
        <div className="text-3xl">{icon}</div>
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          {loading ? (
            <div className="w-12 h-8 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-3xl font-bold text-gray-900">{value ?? 0}</p>
          )}
        </div>
      </div>
      {onClick && (
        <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
          <span>{selected ? 'Click to collapse' : 'Click to expand'}</span>
          <svg xmlns="http://www.w3.org/2000/svg" className={`w-3 h-3 transition-transform ${selected ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      )}
    </button>
  );
}
