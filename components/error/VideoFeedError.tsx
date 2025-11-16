'use client';

import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface VideoFeedErrorProps {
  onRetry?: () => void;
  message?: string;
}

/**
 * Video Feed Error Component
 * Requirements: 1.1
 * 
 * Displays error message when video feed fails to load
 */
export function VideoFeedError({ onRetry, message }: VideoFeedErrorProps) {
  const defaultMessage = 'Unable to load video feed. Please check your connection and try again.';

  return (
    <div
      className="relative w-full bg-muted rounded-lg overflow-hidden flex items-center justify-center"
      style={{ aspectRatio: '16/9' }}
    >
      <div className="text-center p-8 max-w-md">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-foreground mb-2">Video Feed Error</h3>
        <p className="text-sm text-muted-foreground mb-6">{message || defaultMessage}</p>
        {onRetry && (
          <Button onClick={onRetry} variant="default" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Retry Connection
          </Button>
        )}
      </div>
    </div>
  );
}
