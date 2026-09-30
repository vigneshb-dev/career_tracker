import React from 'react';
import { Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no active records matching your criteria. Try adjusting filters or add a new entry.',
  actionText,
  onAction,
  icon,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-100 shadow-sm text-center">
      <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center text-brand-600 mb-4 border border-brand-100 shadow-inner">
        {icon || <Inbox className="w-7 h-7 stroke-[1.75]" />}
      </div>
      <h3 className="text-lg font-bold text-slate-900 tracking-tight">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-1.5 leading-relaxed">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold rounded-xl shadow-sm hover:shadow transition-all duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>{actionText}</span>
        </button>
      )}
    </div>
  );
};
