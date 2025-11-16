'use client';

import { DetectionSession } from '@/types/session';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, memo } from 'react';

/**
 * SessionDetail modal component for displaying detailed session information
 * Requirements: 4.5
 * Optimized with React.memo and enhanced accessibility
 */

interface SessionDetailProps {
  session: DetectionSession | null;
  onClose: () => void;
}

export const SessionDetail = memo(function SessionDetail({ session, onClose }: SessionDetailProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Close on escape key and manage focus
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (session) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
      
      // Focus the close button when modal opens
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 0);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [session, onClose]);

  if (!session) return null;

  const { timestamp, duration, counts, totalVehicles, averageFps, insights } = session;
  const minutes = Math.floor(duration / 60);
  const seconds = duration % 60;

  // Calculate percentages
  const carPercentage = ((counts.cars / totalVehicles) * 100).toFixed(1);
  const truckBusPercentage = ((counts.truckBus / totalVehicles) * 100).toFixed(1);
  const motorcyclePercentage = ((counts.motorcycle / totalVehicles) * 100).toFixed(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-detail-title"
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-card rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 id="session-detail-title" className="text-2xl font-bold text-foreground">Session Details</h2>
            <p className="text-sm text-muted-foreground mt-1">
              <time dateTime={timestamp.toISOString()}>
                {timestamp.toLocaleDateString()} at {timestamp.toLocaleTimeString()}
              </time>
            </p>
          </div>
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
            aria-label="Close session details"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </Button>
        </header>

        {/* Content */}
        <div className="p-6 space-grid-6">
          {/* Summary Statistics */}
          <section aria-labelledby="summary-heading">
            <h3 id="summary-heading" className="text-lg font-semibold text-foreground mb-4">Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 space-grid-4">
              <div className="bg-muted rounded-lg p-4" role="group" aria-label="Session duration">
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="text-2xl font-bold text-foreground mt-1" aria-label={`${minutes} minutes ${seconds} seconds`}>
                  {minutes}m {seconds}s
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4" role="group" aria-label="Total vehicles detected">
                <div className="text-sm text-muted-foreground">Total Vehicles</div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {totalVehicles}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4" role="group" aria-label="Average frames per second">
                <div className="text-sm text-muted-foreground">Average FPS</div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {averageFps.toFixed(1)}
                </div>
              </div>
              <div className="bg-muted rounded-lg p-4" role="group" aria-label="Number of insights">
                <div className="text-sm text-muted-foreground">Insights</div>
                <div className="text-2xl font-bold text-foreground mt-1">
                  {insights.length}
                </div>
              </div>
            </div>
          </section>

          {/* Vehicle Breakdown */}
          <section aria-labelledby="breakdown-heading">
            <h3 id="breakdown-heading" className="text-lg font-semibold text-foreground mb-4">
              Vehicle Breakdown
            </h3>
            <div className="space-grid-4">
              {/* Cars */}
              <div className="border border-border rounded-lg p-4" role="group" aria-label={`Cars: ${counts.cars} vehicles, ${carPercentage} percent`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-grid-3">
                    <div className="w-3 h-3 rounded-full bg-vehicle-cars" aria-hidden="true" />
                    <span className="font-semibold text-foreground">Cars</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-vehicle-cars">
                      {counts.cars}
                    </div>
                    <div className="text-sm text-muted-foreground">{carPercentage}%</div>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={parseFloat(carPercentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${carPercentage} percent cars`}>
                  <div
                    className="bg-vehicle-cars h-2 rounded-full transition-all"
                    style={{ width: `${carPercentage}%` }}
                  />
                </div>
              </div>

              {/* Truck-Bus */}
              <div className="border border-border rounded-lg p-4" role="group" aria-label={`Truck-Bus: ${counts.truckBus} vehicles, ${truckBusPercentage} percent`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-grid-3">
                    <div className="w-3 h-3 rounded-full bg-vehicle-truck-bus" aria-hidden="true" />
                    <span className="font-semibold text-foreground">Truck-Bus</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-vehicle-truck-bus">
                      {counts.truckBus}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {truckBusPercentage}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={parseFloat(truckBusPercentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${truckBusPercentage} percent truck-bus`}>
                  <div
                    className="bg-vehicle-truck-bus h-2 rounded-full transition-all"
                    style={{ width: `${truckBusPercentage}%` }}
                  />
                </div>
              </div>

              {/* Motorcycles */}
              <div className="border border-border rounded-lg p-4" role="group" aria-label={`Motorcycles: ${counts.motorcycle} vehicles, ${motorcyclePercentage} percent`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-grid-3">
                    <div className="w-3 h-3 rounded-full bg-vehicle-motorcycle" aria-hidden="true" />
                    <span className="font-semibold text-foreground">Motorcycles</span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-vehicle-motorcycle">
                      {counts.motorcycle}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {motorcyclePercentage}%
                    </div>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-2" role="progressbar" aria-valuenow={parseFloat(motorcyclePercentage)} aria-valuemin={0} aria-valuemax={100} aria-label={`${motorcyclePercentage} percent motorcycles`}>
                  <div
                    className="bg-vehicle-motorcycle h-2 rounded-full transition-all"
                    style={{ width: `${motorcyclePercentage}%` }}
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Insights */}
          {insights.length > 0 && (
            <section aria-labelledby="insights-heading">
              <h3 id="insights-heading" className="text-lg font-semibold text-foreground mb-4">
                AI Insights ({insights.length})
              </h3>
              <div className="space-grid-3" role="list">
                {insights.map((insight) => (
                  <article
                    key={insight.id}
                    className="border border-border rounded-lg p-4 flex items-start space-grid-3"
                    role="listitem"
                  >
                    <div className="flex-shrink-0 mt-1">
                      {insight.severity === 'alert' && (
                        <div className="w-2 h-2 rounded-full bg-destructive" aria-label="Alert severity" role="img" />
                      )}
                      {insight.severity === 'warning' && (
                        <div className="w-2 h-2 rounded-full bg-vehicle-truck-bus" aria-label="Warning severity" role="img" />
                      )}
                      {insight.severity === 'info' && (
                        <div className="w-2 h-2 rounded-full bg-vehicle-cars" aria-label="Info severity" role="img" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{insight.message}</p>
                      <time className="text-xs text-muted-foreground mt-1 block" dateTime={insight.timestamp.toISOString()}>
                        {insight.timestamp.toLocaleTimeString()}
                      </time>
                    </div>
                    <Badge
                      variant={
                        insight.severity === 'alert'
                          ? 'destructive'
                          : insight.severity === 'warning'
                          ? 'default'
                          : 'secondary'
                      }
                      className="flex-shrink-0"
                    >
                      {insight.severity}
                    </Badge>
                  </article>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Footer */}
        <footer className="sticky bottom-0 bg-card border-t border-border px-6 py-4">
          <Button onClick={onClose} className="w-full">
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
});
