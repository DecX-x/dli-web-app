'use client';

import { useEffect, useRef, useState, memo } from 'react';
import { Detection } from '@/types/detection';
import { VideoFeedError } from '@/components/error/VideoFeedError';
import { DetectionFeedSkeleton } from '@/components/loading/SkeletonLoader';

interface DetectionFeedProps {
  detections: Detection[];
  fps: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  videoSrc?: string | null; // Video source URL
}

/**
 * DetectionFeed component displays a video feed with real-time vehicle detection overlays
 * Requirements: 1.1, 1.3, 1.5, 1.2, 2.1, 1.4
 * Optimized with React.memo for performance
 */
// Track history for motion trails
interface TrackHistory {
  [trackId: number]: { x: number; y: number; timestamp: number }[];
}

export const DetectionFeed = memo(function DetectionFeed({ detections, fps, isLoading = false, error = null, onRetry, videoSrc = null }: DetectionFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 });
  
  // Store track history for motion trails
  const trackHistory = useRef<TrackHistory>({});
  const maxTrailLength = 15; // Number of trail points

  // Color scheme for vehicle categories
  const categoryColors = {
    cars: '#3b82f6',
    'truck-bus': '#f97316',
    motorcycle: '#10b981',
  };

  // Pause video when loaded (prevent autoplay)
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !videoSrc) return;

    const handleLoadedData = () => {
      video.pause(); // Force pause after video loads
    };

    video.addEventListener('loadeddata', handleLoadedData);
    
    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoSrc]);

  // Update canvas dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = (width * 9) / 16; // Maintain 16:9 aspect ratio
        setDimensions({ width, height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Draw bounding boxes on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Get video's natural dimensions (actual video resolution)
    const videoWidth = video.videoWidth || 1920;
    const videoHeight = video.videoHeight || 1080;

    // Get canvas display dimensions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Calculate scale factors from video resolution to canvas display size
    const scaleX = canvasWidth / videoWidth;
    const scaleY = canvasHeight / videoHeight;

    // Update track history and draw trails
    const currentTime = Date.now();
    
    // Draw each detection
    detections.forEach((detection) => {
      const { bbox, category, confidence, track_id } = detection;
      const color = categoryColors[category];

      // Coordinates from backend are in video's natural resolution
      // Scale them to canvas display size
      const x = bbox.x * scaleX;
      const y = bbox.y * scaleY;
      const width = bbox.width * scaleX;
      const height = bbox.height * scaleY;

      // Calculate center point for trail
      const centerX = x + width / 2;
      const centerY = y + height / 2;

      // Update track history
      if (track_id) {
        if (!trackHistory.current[track_id]) {
          trackHistory.current[track_id] = [];
        }
        
        trackHistory.current[track_id].push({
          x: centerX,
          y: centerY,
          timestamp: currentTime
        });

        // Keep only recent points
        if (trackHistory.current[track_id].length > maxTrailLength) {
          trackHistory.current[track_id].shift();
        }

        // Draw motion trail
        const trail = trackHistory.current[track_id];
        if (trail.length > 1) {
          ctx.beginPath();
          ctx.moveTo(trail[0].x, trail[0].y);
          
          for (let i = 1; i < trail.length; i++) {
            ctx.lineTo(trail[i].x, trail[i].y);
          }
          
          // Trail styling with gradient opacity
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.globalAlpha = 0.5;
          ctx.stroke();
          ctx.globalAlpha = 1.0;

          // Draw trail points
          trail.forEach((point, index) => {
            const alpha = (index + 1) / trail.length; // Fade from old to new
            ctx.fillStyle = color;
            ctx.globalAlpha = alpha * 0.6;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1.0;
          });
        }
      }

      // Draw bounding box
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw corner accents (more professional look)
      const cornerLength = 15;
      ctx.lineWidth = 4;
      
      // Top-left corner
      ctx.beginPath();
      ctx.moveTo(x, y + cornerLength);
      ctx.lineTo(x, y);
      ctx.lineTo(x + cornerLength, y);
      ctx.stroke();
      
      // Top-right corner
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y);
      ctx.lineTo(x + width, y);
      ctx.lineTo(x + width, y + cornerLength);
      ctx.stroke();
      
      // Bottom-left corner
      ctx.beginPath();
      ctx.moveTo(x, y + height - cornerLength);
      ctx.lineTo(x, y + height);
      ctx.lineTo(x + cornerLength, y + height);
      ctx.stroke();
      
      // Bottom-right corner
      ctx.beginPath();
      ctx.moveTo(x + width - cornerLength, y + height);
      ctx.lineTo(x + width, y + height);
      ctx.lineTo(x + width, y + height - cornerLength);
      ctx.stroke();

      // Draw label background
      const label = track_id ? `ID:${track_id} ${category}` : category;
      ctx.font = 'bold 13px Inter, system-ui, sans-serif';
      const textMetrics = ctx.measureText(label);
      const labelHeight = 22;
      const labelWidth = textMetrics.width + 12;

      ctx.fillStyle = color;
      ctx.fillRect(x, y - labelHeight - 2, labelWidth, labelHeight);

      // Draw label text
      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, x + 6, y - 8);
    });

    // Clean up old track history (remove tracks not seen in last 2 seconds)
    Object.keys(trackHistory.current).forEach(trackId => {
      const trail = trackHistory.current[parseInt(trackId)];
      if (trail && trail.length > 0) {
        const lastSeen = trail[trail.length - 1].timestamp;
        if (currentTime - lastSeen > 2000) {
          delete trackHistory.current[parseInt(trackId)];
        }
      }
    });
  }, [detections, dimensions, categoryColors, maxTrailLength]);

  // Show loading state
  if (isLoading) {
    return <DetectionFeedSkeleton />;
  }

  // Show error state
  if (error) {
    return <VideoFeedError message={error} onRetry={onRetry} />;
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-muted rounded-lg overflow-hidden"
      style={{ aspectRatio: '16/9' }}
      role="region"
      aria-label="Live vehicle detection feed"
    >
      {/* Video player or placeholder */}
      {videoSrc ? (
        <video
          ref={videoRef}
          src={videoSrc}
          className="absolute inset-0 w-full h-full object-contain bg-black"
          loop
          muted
          playsInline
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary">
          <div className="text-center">
            <div className="text-muted-foreground text-lg font-medium mb-2">
              Live Detection Feed
            </div>
            <div className="text-muted-foreground/70 text-sm">
              Upload a video to start detection
            </div>
          </div>
        </div>
      )}

      {/* Canvas overlay for bounding boxes */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="absolute inset-0 w-full h-full pointer-events-none"
        aria-label={`Detection canvas showing ${detections.length} vehicles detected`}
      />

      {/* FPS counter */}
      {fps > 0 && (
        <div 
          className="absolute top-4 right-4 bg-card/90 border border-border px-3 py-1.5 rounded text-sm font-mono text-foreground"
          role="status"
          aria-live="polite"
          aria-label={`Frame rate: ${fps.toFixed(1)} frames per second`}
        >
          {fps.toFixed(1)} FPS
        </div>
      )}
    </div>
  );
});
