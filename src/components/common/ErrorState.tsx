import React from 'react';
import { AlertCircle, RotateCcw, ArrowLeft } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message = "We couldn't load this data or page at the moment. Please check your network and try again.",
  onRetry,
  onGoBack,
  className = ''
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl border border-rose-200 shadow-subtle ${className}`}
    >
      <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-sm">
        <AlertCircle className="w-6 h-6 text-rose-600" />
      </div>

      <h3 className="text-base font-bold text-slate-900 tracking-tight mb-1">
        {title}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mb-6 leading-relaxed">
        {message}
      </p>

      <div className="flex items-center gap-3">
        {onGoBack && (
          <Button variant="outline" size="sm" onClick={onGoBack} leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
            Go Back
          </Button>
        )}
        {onRetry && (
          <Button variant="primary" size="sm" onClick={onRetry} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
            Try Again
          </Button>
        )}
      </div>
    </div>
  );
};
