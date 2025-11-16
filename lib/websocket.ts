/**
 * WebSocket client for real-time vehicle detection
 */

export interface DetectionCoordinates {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

export interface VehicleDetection {
  track_id: number;
  vehicle_type: 'car' | 'truck-bus' | 'motorcycle';
  coordinates: DetectionCoordinates;
}

export interface DetectionResponse {
  detections: VehicleDetection[];
  timestamp: number;
  processing_time: number;
  frame_processed: boolean;
  error?: string;
}

export interface ConnectionTestResponse {
  message: string;
  gpu_available: boolean;
  status: string;
}

export class VehicleDetectionWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 2000;
  private isIntentionallyClosed = false;

  constructor(url: string = 'ws://localhost:8000/ws') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        this.isIntentionallyClosed = false;

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected');
          this.reconnectAttempts = 0;
          resolve(true);
        };

        this.ws.onerror = (error) => {
          console.error('❌ WebSocket error:', error);
          reject(new Error('Failed to connect to WebSocket server'));
        };

        this.ws.onclose = () => {
          console.log('🔌 WebSocket disconnected');
          if (!this.isIntentionallyClosed && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Reconnect to WebSocket server
   */
  private reconnect() {
    this.reconnectAttempts++;
    console.log(`🔄 Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, this.reconnectDelay);
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<ConnectionTestResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const handler = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          this.ws?.removeEventListener('message', handler);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify({ type: 'connection_test' }));
    });
  }

  /**
   * Send video frame for detection
   */
  async sendFrame(frameBase64: string): Promise<DetectionResponse> {
    return new Promise((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not connected'));
        return;
      }

      const handler = (event: MessageEvent) => {
        try {
          const data: DetectionResponse = JSON.parse(event.data);
          this.ws?.removeEventListener('message', handler);
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };

      this.ws.addEventListener('message', handler);
      this.ws.send(JSON.stringify({
        frame: frameBase64,
        timestamp: Date.now() / 1000
      }));
    });
  }

  /**
   * Set message handler for streaming
   */
  onMessage(callback: (data: DetectionResponse) => void) {
    if (!this.ws) return;

    this.ws.onmessage = (event) => {
      try {
        const data: DetectionResponse = JSON.parse(event.data);
        callback(data);
      } catch (error) {
        console.error('Error parsing message:', error);
      }
    };
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Close connection
   */
  close() {
    this.isIntentionallyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

/**
 * Stream video like a live camera feed
 * Video plays continuously and sends frames at target FPS
 * Returns video dimensions for coordinate scaling
 */
export function startLiveStream(
  videoElement: HTMLVideoElement,
  wsClient: VehicleDetectionWebSocket,
  onFrame: (response: DetectionResponse, videoDimensions: { width: number; height: number }) => void,
  targetFps: number = 30
): () => void {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  let isStreaming = true;
  let frameCount = 0;
  let lastFrameTime = Date.now();
  const frameInterval = 1000 / targetFps; // Max 30 FPS
  let isProcessing = false;

  const captureAndSend = async () => {
    if (!isStreaming) return;

    const now = Date.now();
    const elapsed = now - lastFrameTime;

    // Throttle to target FPS (max 30)
    if (elapsed >= frameInterval && !isProcessing) {
      isProcessing = true;
      lastFrameTime = now;

      try {
        // Get actual video dimensions (natural size)
        const videoWidth = videoElement.videoWidth;
        const videoHeight = videoElement.videoHeight;

        // Set canvas to match video's natural dimensions
        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
        }

        // Draw current video frame at full resolution
        ctx.drawImage(videoElement, 0, 0, videoWidth, videoHeight);

        // Convert to base64 (same frame that's displayed)
        const frameBase64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1];

        // Send to backend
        const response = await wsClient.sendFrame(frameBase64);
        frameCount++;
        
        // Callback with results and video dimensions for coordinate mapping
        onFrame(response, { width: videoWidth, height: videoHeight });
      } catch (error) {
        console.error('Error processing frame:', error);
      } finally {
        isProcessing = false;
      }
    }

    // Continue streaming
    requestAnimationFrame(captureAndSend);
  };

  // Start streaming
  captureAndSend();

  // Return stop function
  return () => {
    isStreaming = false;
  };
}
