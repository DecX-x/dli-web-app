'use client';

import { useState, useEffect, useRef } from 'react';
import { DetectionFeed } from '@/components/detection/DetectionFeed';
import { VehicleCounter } from '@/components/detection/VehicleCounter';
import { InsightPanel } from '@/components/insights/InsightPanel';
import { VideoUpload } from '@/components/upload/VideoUpload';
import { Detection, convertBackendDetection } from '@/types/detection';
import { VehicleCounts } from '@/types/session';
import { Insight } from '@/types/insight';
import { getAIInsight } from '@/lib/insights';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { VehicleCounterSkeleton } from '@/components/loading/SkeletonLoader';
import { VehicleDetectionWebSocket } from '@/lib/websocket';
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const wsClient = useRef<VehicleDetectionWebSocket | null>(null);
  const processingRef = useRef<any>(false);
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
  const selectedFileRef = useRef<File | null>(null);

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
  
  useEffect(() => {
    selectedFileRef.current = selectedFile;
  }, [selectedFile]);

  // Handle file selection
  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setVehicleCounts({ cars: 0, truckBus: 0, motorcycle: 0 });
    setDetections([]);
    setFps(0);
    setInsights([]);
    
    // Reset refs
    vehicleCountsRef.current = { cars: 0, truckBus: 0, motorcycle: 0 };
    fpsRef.current = 0;
    insightsRef.current = [];
    
    // Reset track IDs and session
    seenTrackIds.current.clear();
    sessionStartTime.current = null;
    
    // Create video URL for display
    if (videoSrc) {
      URL.revokeObjectURL(videoSrc);
    }
    const url = URL.createObjectURL(file);
    setVideoSrc(url);
  };
  
  // Cleanup video URL and auto-save interval on unmount
  useEffect(() => {
    return () => {
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }
      if (autoSaveIntervalRef.current) {
        clearInterval(autoSaveIntervalRef.current);
      }
    };
  }, [videoSrc]);

  // Start live streaming (like camera)
  const handleStartProcessing = () => {
    if (!wsClient.current || !wsClient.current.isConnected()) {
      setFeedError('Please ensure WebSocket is connected');
      return;
    }

    // Get video element from DetectionFeed
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (!videoElement) {
      setFeedError('Video element not found');
      return;
    }

    // Play video when starting detection
    videoElement.play().catch(err => {
      console.error('Error playing video:', err);
    });

    setIsProcessing(true);
    setIsLoading(false);
    fpsCounterRef.current = { count: 0, lastTime: Date.now() };
    
    // Start session timer
    sessionStartTime.current = Date.now();
    
    // Start auto-save interval (every 5 seconds)
    autoSaveIntervalRef.current = setInterval(() => {
      autoSaveSession();
    }, 5000);

    // Import startLiveStream function
    import('@/lib/websocket').then(({ startLiveStream }) => {
      const stopStream = startLiveStream(
        videoElement,
        wsClient.current!,
        (response, videoDimensions) => {
          // Convert backend detections to frontend format
          // Coordinates from backend are already in video's natural resolution
          const frontendDetections = response.detections.map(det =>
            convertBackendDetection(det, response.timestamp)
          );

          setDetections(frontendDetections);

          // Update vehicle counts - only count NEW track_ids (unique vehicles)
          let hasNewVehicles = false;
          const newCounts = { cars: 0, truckBus: 0, motorcycle: 0 };
          
          frontendDetections.forEach(det => {
            // Only count if this track_id hasn't been seen before
            if (det.track_id && !seenTrackIds.current.has(det.track_id)) {
              seenTrackIds.current.add(det.track_id);
              hasNewVehicles = true;
              
              console.log(`🚗 New vehicle detected! Track ID: ${det.track_id}, Type: ${det.category}`);
              
              // Count by category
              if (det.category === 'cars') newCounts.cars += 1;
              else if (det.category === 'truck-bus') newCounts.truckBus += 1;
              else if (det.category === 'motorcycle') newCounts.motorcycle += 1;
            }
          });
          
          // Update state if there are new vehicles
          if (hasNewVehicles) {
            setVehicleCounts(prev => ({
              cars: prev.cars + newCounts.cars,
              truckBus: prev.truckBus + newCounts.truckBus,
              motorcycle: prev.motorcycle + newCounts.motorcycle,
            }));
            console.log(`📊 Updated counts: Cars +${newCounts.cars}, Trucks +${newCounts.truckBus}, Motorcycles +${newCounts.motorcycle}`);
          }

          // Calculate FPS (capped at 30)
          fpsCounterRef.current.count++;
          const now = Date.now();
          const elapsed = now - fpsCounterRef.current.lastTime;
          if (elapsed >= 1000) {
            const currentFps = Math.min((fpsCounterRef.current.count * 1000) / elapsed, 30);
            setFps(currentFps);
            fpsCounterRef.current = { count: 0, lastTime: now };
          }
        },
        30 // Target 30 FPS max
      );

      // Store stop function
      processingRef.current = stopStream as any;
    });
  };

  // Stop processing
  const handleStopProcessing = () => {
    // Pause video when stopping detection
    const videoElement = document.querySelector('video') as HTMLVideoElement;
    if (videoElement) {
      videoElement.pause();
    }

    if (typeof processingRef.current === 'function') {
      processingRef.current(); // Call stop function
    }
    processingRef.current = false;
    setIsProcessing(false);
    setFps(0);
    
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
      console.log('⏭️ Skipping auto-save: no session started');
      return;
    }
    
    try {
      const duration = Math.floor((Date.now() - sessionStartTime.current) / 1000);
      const counts = vehicleCountsRef.current;
      const totalVehicles = counts.cars + counts.truckBus + counts.motorcycle;
      
      // Skip if no vehicles detected yet
      if (totalVehicles === 0) {
        console.log('⏭️ Skipping auto-save: no vehicles detected yet');
        return;
      }
      
      // Calculate average FPS (use ref value)
      const averageFps = fpsRef.current;
      
      // Get video info if available
      const videoElement = document.querySelector('video') as HTMLVideoElement;
      const file = selectedFileRef.current;
      const videoInfo = file ? {
        fileName: file.name,
        fileSize: file.size,
        duration: videoElement?.duration || 0,
      } : undefined;
      
      console.log('💾 Auto-saving session...', { counts, totalVehicles, duration });
      
      // Save to MongoDB via API
      const sessionId = await SessionStorage.saveSession({
        duration,
        counts,
        totalVehicles,
        averageFps,
        insights: insightsRef.current,
        videoInfo,
        trackIds: Array.from(seenTrackIds.current),
      });
      
      console.log('✅ Auto-saved session:', sessionId, `(${totalVehicles} vehicles, ${duration}s)`);
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
                videoSrc={videoSrc}
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
            {/* Video Upload */}
            <ErrorBoundary>
              <VideoUpload
                onFileSelect={handleFileSelect}
                onStart={handleStartProcessing}
                onStop={handleStopProcessing}
                isProcessing={isProcessing}
                progress={0}
                disabled={!isConnected}
              />
            </ErrorBoundary>

            {/* Vehicle Counter */}
            <ErrorBoundary>
              {isLoading ? (
                <VehicleCounterSkeleton />
              ) : (
                <VehicleCounter counts={vehicleCounts} />
              )}
            </ErrorBoundary>
            
            {/* Auto-save indicator */}
            {isProcessing && (
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
