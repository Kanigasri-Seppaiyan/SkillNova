import React from 'react';
import { Loader2, AlertTriangle, Inbox, RefreshCw, X } from 'lucide-react';

export const Card: React.FC<{
  children: React.ReactNode;
  className?: string;
  gradientBorder?: boolean;
}> = ({ children, className = '', gradientBorder = false }) => (
  <div
    className={`bg-white rounded-2xl p-6 border ${
      gradientBorder ? 'border-[#315B8A] shadow-md' : 'border-[#DCE3EC]'
    } shadow-sm hover:shadow-md hover:border-[#315B8A]/60 transition-all duration-200 ${className}`}
  >
    {children}
  </div>
);

export const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'secondary';
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, variant = 'primary', className = '', style }) => {
  const styles = {
    primary: 'bg-[#EAF0F7] text-[#142B4A] border-[#DCE3EC]',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-[#EAF0F7] text-[#1E3A5F] border-[#DCE3EC]',
    secondary: 'bg-[#F5F7FA] text-[#64748B] border-[#DCE3EC]'
  };

  return (
    <span
      style={style}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const ProgressBar: React.FC<{
  value: number;
  max?: number;
  label?: string;
  showPercent?: boolean;
  colorClass?: string;
}> = ({ value, max = 100, label, showPercent = true, colorClass = 'bg-[#142B4A]' }) => {
  const percentage = Math.min(100, Math.max(0, Math.round((value / max) * 100)));

  return (
    <div className="w-full">
      {(label || showPercent) && (
        <div className="flex justify-between items-center mb-1.5 text-xs text-[#64748B]">
          {label && <span className="font-medium text-[#142B4A]">{label}</span>}
          {showPercent && <span className="font-bold text-[#142B4A]">{percentage}%</span>}
        </div>
      )}
      <div className="w-full h-2.5 bg-[#EAF0F7] rounded-full overflow-hidden border border-[#DCE3EC]/60">
        <div
          className={`h-full transition-all duration-500 rounded-full ${colorClass}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading carrier data...' }) => (
  <div className="flex flex-col items-center justify-center p-12 text-[#64748B] space-y-3">
    <Loader2 className="w-8 h-8 animate-spin text-[#142B4A]" />
    <p className="text-sm font-semibold text-[#142B4A]">{message}</p>
  </div>
);

export const ErrorState: React.FC<{ message?: string; onRetry?: () => void }> = ({
  message = 'Failed to load content',
  onRetry
}) => (
  <div className="flex flex-col items-center justify-center p-8 bg-red-50 border border-red-200 rounded-2xl text-center space-y-3">
    <AlertTriangle className="w-8 h-8 text-red-600" />
    <p className="text-sm text-red-700 font-semibold">{message}</p>
    {onRetry && (
      <button
        onClick={onRetry}
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-all shadow-sm"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        <span>Try Again</span>
      </button>
    )}
  </div>
);

export const EmptyState: React.FC<{
  title?: string;
  description?: string;
  actionText?: string;
  onAction?: () => void;
}> = ({ title = 'No data found', description = 'There is no information to display here right now.', actionText, onAction }) => (
  <div className="flex flex-col items-center justify-center p-12 border border-dashed border-[#DCE3EC] rounded-2xl text-center space-y-3 bg-[#F5F7FA]">
    <div className="w-12 h-12 rounded-full bg-white border border-[#DCE3EC] flex items-center justify-center text-[#64748B] shadow-sm">
      <Inbox className="w-6 h-6" />
    </div>
    <h4 className="text-base font-bold text-[#142B4A]">{title}</h4>
    <p className="text-xs text-[#64748B] max-w-sm">{description}</p>
    {actionText && onAction && (
      <button
        onClick={onAction}
        className="mt-2 px-4 py-2 bg-[#142B4A] hover:bg-[#1E3A5F] text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
      >
        {actionText}
      </button>
    )}
  </div>
);

export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-[#DCE3EC] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#DCE3EC] bg-[#F5F7FA]">
          <h3 className="text-base font-bold text-[#142B4A]">{title}</h3>
          <button onClick={onClose} className="text-[#64748B] hover:text-[#142B4A] transition-colors p-1 rounded-lg hover:bg-[#EAF0F7]">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};
