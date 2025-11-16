'use client';

import { useEffect, useRef, memo } from 'react';
import { Insight, InsightSeverity } from '@/types/insight';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';

/**
 * InsightPanel component displays AI-generated traffic insights
 * Requirements: 3.2, 3.3, 3.4, 3.1, 3.5
 * Optimized with React.memo for performance
 */

interface InsightPanelProps {
  insights: Insight[];
  maxVisible?: number;
  onGenerateInsight?: () => void;
  isGenerating?: boolean;
}

/**
 * Get severity indicator color using design system
 */
function getSeverityColor(severity: InsightSeverity): string {
  switch (severity) {
    case 'alert':
      return 'bg-destructive';
    case 'warning':
      return 'bg-vehicle-truck-bus';
    case 'info':
    default:
      return 'bg-vehicle-cars';
  }
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - timestamp.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  
  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else {
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  }
}

export const InsightPanel = memo(function InsightPanel({ 
  insights, 
  maxVisible = 10, 
  onGenerateInsight,
  isGenerating = false 
}: InsightPanelProps) {
  // Display only the most recent insights
  const visibleInsights = insights.slice(0, maxVisible);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevInsightCountRef = useRef(insights.length);
  
  // Auto-scroll to newest insight when new insights arrive
  // Requirements: 3.5
  useEffect(() => {
    if (insights.length > prevInsightCountRef.current && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
    prevInsightCountRef.current = insights.length;
  }, [insights.length]);
  
  return (
    <div className="flex flex-col h-full bg-card rounded-lg border border-border overflow-hidden" aria-label="AI insights panel">
      {/* Header with Generate Button - Compact */}
      <header className="flex items-center justify-between px-3 py-2 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground truncate">AI Insights</h2>
          </div>
        </div>
        
        {onGenerateInsight && (
          <Button
            onClick={onGenerateInsight}
            disabled={isGenerating}
            size="sm"
            className="gap-1.5 h-8 text-xs flex-shrink-0"
            aria-label="Generate new AI insight"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                <span className="hidden sm:inline">Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline">Generate</span>
              </>
            )}
          </Button>
        )}
      </header>
      
      {/* Insights List - Compact spacing */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-2 space-y-2 min-h-0"
        role="feed"
        aria-live="polite"
        aria-label="Traffic insights feed"
      >
        {visibleInsights.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4 py-6 text-muted-foreground" role="status">
            <Sparkles className="h-10 w-10 mb-2 opacity-50" aria-hidden="true" />
            <p className="text-sm font-medium">No insights yet</p>
            <p className="text-xs mt-1">Click "Generate" to analyze traffic</p>
          </div>
        ) : (
          visibleInsights.map((insight, index) => (
            <article
              key={insight.id}
              className={cn(
                'flex items-start gap-2 p-2.5 rounded-md bg-muted/50 hover:bg-muted transition-colors',
                index === 0 && 'animate-in fade-in slide-in-from-top-2 duration-300'
              )}
              role="article"
              aria-label={`${insight.severity} insight: ${insight.message}`}
            >
              {/* Severity indicator dot */}
              <div className="flex-shrink-0 mt-1">
                <div
                  className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    getSeverityColor(insight.severity)
                  )}
                  aria-label={`${insight.severity} severity`}
                  role="img"
                />
              </div>
              
              {/* Insight content */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-foreground leading-relaxed">
                  {insight.message}
                </p>
                <time className="text-[10px] text-muted-foreground mt-0.5 block" dateTime={insight.timestamp.toISOString()}>
                  {formatRelativeTime(insight.timestamp)}
                </time>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
});
