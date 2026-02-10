interface ProgressBarProps {
  percent: number;
  label?: string;
  size?: 'sm' | 'md';
}

export default function ProgressBar({ percent, label, size = 'md' }: ProgressBarProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const isComplete = clampedPercent === 100;
  const trackHeight = size === 'sm' ? 'h-1.5' : 'h-2.5';
  const fillColor = isComplete ? 'bg-green-500' : 'bg-blue-600';

  return (
    <div>
      <div className={`w-full bg-gray-200 rounded-full ${trackHeight} overflow-hidden`}>
        <div
          className={`${trackHeight} rounded-full transition-all duration-300 ${fillColor}`}
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {label && (
        <p className={`mt-1 text-xs ${isComplete ? 'text-green-600 font-medium' : 'text-gray-500'}`}>
          {label}
        </p>
      )}
    </div>
  );
}
