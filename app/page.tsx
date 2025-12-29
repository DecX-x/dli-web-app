'use client';

import { useState, useEffect, useRef } from 'react';
import { DetectionFeed } from '@/components/detection/DetectionFeed';
import { VehicleCounter } from '@/components/detection/VehicleCounter';
import { InsightPanel } from '@/components/insights/InsightPanel';
import { RTSPStream } from '@/components/stream/RTSPStream';
import { Detection, convertBackendDetection } from '@/types/detection';
import { VehicleCounts } from '@/types/session';
import { Insight } from '@/types/insight';
import { getAIInsight } from '@/lib/insights';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { VehicleCounterSkeleton } from '@/components/loading/SkeletonLoader';
import { VehicleDetectionWebSocket, startRTSPStream } from '@/lib/websocket';
import { SessionStorage } from '@/lib/storage';
import { Wifi, WifiOff } from 'lucide-react';

/**
 * Main Dashboard Page - Live Detection View
 * Requirements: 1.1, 1.4, 5.5
 * 
 * Two-column responsive layout:
 * - Left (70%): Real-time detection feed with bounding boxes
 * - Right (30%): Vehicle counters and AI insights panel
 * 
 * Responsive breakpoints:
 * - Mobile (< 768px): Stacked layout
 * - Tablet (768px - 1024px): Adjusted proportions
 * - Desktop (> 1024px): Two-column layout
 */
export default function Home() {
  const [detections, setDetections] = useState<Detection[]>([]);
  const [fps, setFps] = useState(0);
  const [vehicleCounts, setVehicleCounts] = useState<VehicleCounts>({
    cars: 0,
    truckBus: 0,
    motorcycle: 0,
  });
  const [insights, setInsights] = useState<Insight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [feedError, setFeedError] = useState<string | null>(null);
  const [isGeneratingInsight, setIsGeneratingInsight] = useState(false);
  
  // WebSocket state
  const [isConnected, setIsConnected] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamFrame, setStreamFrame] = useState<string | null>(null);
  const [streamStatus, setStreamStatus] = useState<string>('');
  const wsClient = useRef<VehicleDetectionWebSocket | null>(null);
  const stopStreamRef = useRef<(() => void) | null>(null);
  const fpsCounterRef = useRef({ count: 0, lastTime: Date.now() });
  
  // Track unique vehicles by track_id
  const seenTrackIds = useRef<Set<number>>(new Set());
  
  // Session tracking
  const sessionStartTime = useRef<number | null>(null);
  const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to store latest values for auto-save (to avoid stale closure)
  const vehicleCountsRef = useRef<VehicleCounts>({ cars: 0, truckBus: 0, motorcycle: 0 });
  const fpsRef = useRef<number>(0);
  const insightsRef = useRef<Insight[]>([]);

  // Initialize WebSocket connection
  useEffect(() => {
    const initWebSocket = async () => {
      try {
        wsClient.current = new VehicleDetectionWebSocket('ws://localhost:8000/ws');
        await wsClient.current.connect();
        
        // Test connection
        const testResult = await wsClient.current.testConnection();
        console.log('✅ WebSocket connected:', testResult);
        setIsConnected(true);
        setFeedError(null);
      } catch (error) {
        console.error('❌ WebSocket connection failed:', error);
        setIsConnected(false);
        setFeedError('Failed to connect to detection server. Make sure the backend is running on localhost:8000');
      }
    };

    initWebSocket();

    return () => {
      if (wsClient.current) {
        wsClient.current.close();
      }
    };
  }, []);

  // Keep refs in sync with state
  useEffect(() => {
    vehicleCountsRef.current = vehicleCounts;
  }, [vehicleCounts]);
  
  useEffect(() => {
    fpsRef.current = fps;
  }, [fps]);
  
  useEffect(() => {
    insightsRef.current = insights;
  }, [insights]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
      if (stopStreamRef.current) {
        stopStreamRef.current();
      }
    };
  }, []);

  // Current camera name for session saving
  const currentCameraName = useRef<string>('RTSP Stream');

  // Start RTSP streaming
  const handleStartStream = (rtspUrl: string, cameraName: string) => {
    if (!wsClient.current || !wsClient.current.isConnected()) {
      setFeedError('Please ensure WebSocket is connected');
      return;
    }

    // Store camera name
    currentCameraName.current = cameraName;

    // Reset state
    setVehicleCounts({ cars: 0, truckBus: 0, motorcycle: 0 });
    setDetections([]);
    setFps(0);
    setInsights([]);
    setStreamFrame(null);
    seenTrackIds.current.clear();
    vehicleCountsRef.current = { cars: 0, truckBus: 0, motorcycle: 0 };
    fpsRef.current = 0;
    insightsRef.current = [];

    setIsStreaming(true);
    setIsLoading(false);
    setFeedError(null);
    fpsCounterRef.current = { count: 0, lastTime: Date.now() };
    
    // Start session timer
    sessionStartTime.current = Date.now();
    
    // Start auto-save interval (every 5 seconds)
    autoSaveIntervalRef.current = setInterval(() => {
      autoSaveSession();
    }, 5000);

    // Start RTSP stream
    const stopStream = startRTSPStream(
      wsClient.current,
      rtspUrl,
      // On frame received
      (frame, detections, timestamp) => {
        setStreamFrame(frame);
        
        // Convert backend detections to frontend format
        const frontendDetections = detections.map(det =>
          convertBackendDetection(det, timestamp)
        );
        setDetections(frontendDetections);

        // Update vehicle counts - only count NEW track_ids
        let hasNewVehicles = false;
        const newCounts = { cars: 0, truckBus: 0, motorcycle: 0 };
        
        frontendDetections.forEach(det => {
          if (det.track_id && !seenTrackIds.current.has(det.track_id)) {
            seenTrackIds.current.add(det.track_id);
            hasNewVehicles = true;
            
            if (det.category === 'cars') newCounts.cars += 1;
            else if (det.category === 'truck-bus') newCounts.truckBus += 1;
            else if (det.category === 'motorcycle') newCounts.motorcycle += 1;
          }
        });
        
        if (hasNewVehicles) {
          setVehicleCounts(prev => ({
            cars: prev.cars + newCounts.cars,
            truckBus: prev.truckBus + newCounts.truckBus,
            motorcycle: prev.motorcycle + newCounts.motorcycle,
          }));
        }

        // Calculate FPS
        fpsCounterRef.current.count++;
        const now = Date.now();
        const elapsed = now - fpsCounterRef.current.lastTime;
        if (elapsed >= 1000) {
          const currentFps = Math.min((fpsCounterRef.current.count * 1000) / elapsed, 30);
          setFps(currentFps);
          fpsCounterRef.current = { count: 0, lastTime: now };
        }
      },
      // On error
      (error) => {
        console.error('❌ RTSP Stream error:', error);
        setFeedError(error);
        handleStopStream();
      },
      // On status
      (status) => {
        console.log('📡 RTSP Status:', status);
        setStreamStatus(status);
      }
    );

    stopStreamRef.current = stopStream;
  };

  // Stop RTSP streaming
  const handleStopStream = () => {
    if (stopStreamRef.current) {
      stopStreamRef.current();
      stopStreamRef.current = null;
    }
    
    setIsStreaming(false);
    setFps(0);
    setStreamStatus('');
    
    // Stop auto-save interval
    if (autoSaveIntervalRef.current) {
      clearInterval(autoSaveIntervalRef.current);
      autoSaveIntervalRef.current = null;
    }
    
    // Final save when stopping
    autoSaveSession();
  };
  
  // Auto-save session to MongoDB (called every 5 seconds)
  const autoSaveSession = async () => {
    if (!sessionStartTime.current) {
      return;
    }
    
    try {
      const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
      const counts = vehicleCountsRef.current;
      const totalVehicles = counts.cars + counts.truckBus + counts.motorcycle;
      
      // Skip if no vehicles detected yet
      if (totalVehicles === 0) {
        return;
      }
      
      const averageFps = fpsRef.current;
      
      console.log('💾 Auto-saving session...', { counts, totalVehicles, duration });
      
      // Save to MongoDB via API
      const sessionId = await SessionStorage.saveSession({
        duration,
        counts,
        totalVehicles,
        averageFps,
        insights: insightsRef.current,
        videoInfo: {
          fileName: currentCameraName.current,
          fileSize: 0,
          duration: duration,
        },
        trackIds: Array.from(seenTrackIds.current),
      });
      
      console.log('✅ Auto-saved session:', sessionId);
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  };

  // Retry connection
  const handleRetry = async () => {
    setFeedError(null);
    setIsLoading(true);
    
    try {
      if (wsClient.current) {
        await wsClient.current.connect();
        setIsConnected(true);
        setFeedError(null);
      }
    } catch (error) {
      setFeedError('Failed to reconnect. Please check if the backend server is running.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate AI insight on demand
  const handleGenerateInsight = async () => {
    setIsGeneratingInsight(true);
    
    try {
      // Calculate duration since session started
      const duration = sessionStartTime.current 
        ? Math.floor((Date.now() - sessionStartTime.current) / 1000)
        : 0;
      
      // Call AI insights API
      const newInsight = await getAIInsight(vehicleCounts, duration, fps);
      setInsights((prevInsights) => [newInsight, ...prevInsights]);
      
      console.log('✅ AI Insight generated:', newInsight.message);
    } catch (error) {
      console.error('❌ Failed to generate AI insight:', error);
    } finally {
      setIsGeneratingInsight(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] bg-background overflow-y-auto">
      {/* Main container - Scrollable layout */}
      <div className="flex flex-col lg:flex-row gap-3 p-3 lg:p-4">
        {/* Left side: Video feed and insights */}
        <div className="flex-1 flex flex-col gap-2 min-w-0">
          {/* Title and Connection Status */}
          <div className="flex-shrink-0 flex items-center justify-between">
            <h1 className="text-sm lg:text-base font-bold text-foreground leading-tight">
              Vehicle Counter - Live Detection
            </h1>
            <div className="flex items-center gap-2">
              {isConnected ? (
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
                  <Wifi className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Connected</span>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-xs text-destructive">
                  <WifiOff className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Disconnected</span>
                </div>
              )}
            </div>
          </div>

          {/* Video Feed - Full width, natural aspect ratio */}
          <section aria-label="Live detection feed">
            <ErrorBoundary>
              <DetectionFeed 
                detections={detections} 
                fps={fps} 
                isLoading={isLoading}
                error={feedError}
                onRetry={handleRetry}
                streamFrame={streamFrame}
                isRTSPMode={isStreaming || !!streamFrame}
              />
            </ErrorBoundary>
          </section>

          {/* AI Insights Section */}
          <section aria-label="AI insights" className="min-h-[200px]">
            <ErrorBoundary>
              <InsightPanel 
                insights={insights} 
                maxVisible={10}
                onGenerateInsight={handleGenerateInsight}
                isGenerating={isGeneratingInsight}
              />
            </ErrorBoundary>
          </section>
        </div>

        {/* Right sidebar: Upload and Stats */}
        <aside 
          className="w-full lg:w-60 xl:w-64 2xl:w-72 flex-shrink-0 lg:border-l border-border overflow-y-auto" 
          aria-label="Controls and Statistics"
        >
          <div className="space-y-3">
            {/* RTSP Stream Control */}
            <ErrorBoundary>
              <RTSPStream
                onStart={handleStartStream}
                onStop={handleStopStream}
                isStreaming={isStreaming}
                disabled={!isConnected}
              />
            </ErrorBoundary>

            {/* Stream Status */}
            {streamStatus && (
              <div className="rounded-lg border border-border bg-card p-3">
                <p className="text-xs text-muted-foreground">{streamStatus}</p>
              </div>
            )}

            {/* Vehicle Counter */}
            <ErrorBoundary>
              {isLoading ? (
                <VehicleCounterSkeleton />
              ) : (
                <VehicleCounter counts={vehicleCounts} />
              )}
            </ErrorBoundary>
            
            {/* Auto-save indicator */}
            {isStreaming && (
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span>Auto-saving every 5 seconds</span>
                </div>
              </div>
            )}
          </div>
        </aside>
      </div>
    </main>
  );
}
