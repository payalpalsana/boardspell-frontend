import React from 'react';

interface Props {
  status: string;
}

const CLASSES: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  failed:  'bg-red-100 text-red-600',
  skipped: 'bg-gray-100 text-gray-500',
  active:  'bg-blue-100 text-blue-600',
  paused:  'bg-amber-100 text-amber-600',
};

const StatusBadge: React.FC<Props> = ({ status }) => {
  const cls = CLASSES[status] ?? CLASSES.skipped;
  return (
    <span className={`${cls} px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize whitespace-nowrap`}>
      {status}
    </span>
  );
};

export default StatusBadge;
