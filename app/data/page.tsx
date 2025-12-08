'use client';

import { useState, useEffect, useCallback } from 'react';
import { DetectionSession } from '@/types/session';
import { generateHistoricalSessions } from '@/lib/mockData';
import { SessionStorage } from '@/lib/storage';
import { DataTable } from '@/components/data/DataTable';
import { SessionDetail } from '@/components/data/SessionDetail';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { DataTableSkeleton } from '@/components/loading/SkeletonLoader';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trash2, Database } from 'lucide-react';

/**
 * Data page for viewing historical detection sessions
 * Requirements: 4.1, 4.2, 4.5
 * Now loads from MongoDB via API
 */

export default function DataPage() {
  const [sessions, setSessions] = useState<DetectionSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<DetectionSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageStats, setStorageStats] = useState({ totalSessions: 0, totalVehicles: 0 });

  // Load sessions from MongoDB
  const loadSessions = useCallback(async () => {
    setIsLoading(true);
    
    try {
      console.log('📥 Loading sessions from MongoDB...');
      const storedSessions = await SessionStorage.getAllDetectionSessions();
      console.log('📊 Loaded sessions:', storedSessions.length);
      
      // Show actual data from database (no mock fallback)
      setSessions(storedSessions);
      
      // Update storage stats
      const stats = await SessionStorage.getStats();
      console.log('📈 Stats:', stats);
      setStorageStats(stats);
    } catch (error) {
      console.error('❌ Error loading sessions:', error);
      setSessions([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load sessions on mount
  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleSessionSelect = (session: DetectionSession) => {
    setSelectedSession(session);
  };

  const handleCloseDetail = () => {
    setSelectedSession(null);
  };
  
  // Clear all sessions
  const handleClearAll = async () => {
    if (confirm('Are you sure you want to delete all sessions? This cannot be undone.')) {
      await SessionStorage.clearAllSessions();
      loadSessions();
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <header className="mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Historical Data</h1>
              <p className="text-muted-foreground mt-2">
                View and analyze past detection sessions from database
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={loadSessions}
                disabled={isLoading}
                aria-label="Refresh sessions"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {sessions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClearAll}
                  className="text-destructive hover:text-destructive"
                  aria-label="Clear all sessions"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              )}
            </div>
          </div>
          
          {/* Storage Stats */}
          {!isLoading && (
            <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                <span>
                  {storageStats.totalSessions} session{storageStats.totalSessions !== 1 ? 's' : ''}
                </span>
              </div>
              <div>•</div>
              <div>
                {storageStats.totalVehicles} total vehicles detected
              </div>
            </div>
          )}
        </header>

        {/* Loading State */}
        {isLoading && (
          <div role="status" aria-live="polite" aria-label="Loading historical data">
            <DataTableSkeleton />
          </div>
        )}

        {/* Data Table */}
        {!isLoading && sessions.length > 0 && (
          <section aria-label="Historical detection sessions">
            <ErrorBoundary>
              <DataTable sessions={sessions} onSessionSelect={handleSessionSelect} />
            </ErrorBoundary>
          </section>
        )}

        {/* Empty State */}
        {!isLoading && sessions.length === 0 && (
          <div className="bg-card rounded-lg border border-border p-12 text-center" role="status">
            <p className="text-muted-foreground">No historical sessions found</p>
          </div>
        )}

        {/* Session Detail Modal */}
        <ErrorBoundary>
          <SessionDetail session={selectedSession} onClose={handleCloseDetail} />
        </ErrorBoundary>
      </div>
    </main>
  );
}
