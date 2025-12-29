import { NextRequest } from 'next/server';
import { spawn, ChildProcess } from 'child_process';

/**
 * RTSP Stream API Route
 * Connects to RTSP stream via FFmpeg and sends frames as Server-Sent Events
 * Frontend receives frames and sends to backend WebSocket for detection
 */

// Store active streams
const activeStreams = new Map<string, ChildProcess>();

export async function GET(request: NextRequest) {
  const rtspUrl = request.nextUrl.searchParams.get('url');
  const streamId = request.nextUrl.searchParams.get('id') || 'default';
  
  if (!rtspUrl) {
    return new Response(JSON.stringify({ error: 'RTSP URL required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Kill existing stream if any
      const existing = activeStreams.get(streamId);
      if (existing) {
        existing.kill('SIGTERM');
        activeStreams.delete(streamId);
      }

      // Spawn FFmpeg to read RTSP and output JPEG frames
      const ffmpeg = spawn('ffmpeg', [
        '-rtsp_transport', 'tcp',
        '-i', rtspUrl,
        '-f', 'image2pipe',
        '-vcodec', 'mjpeg',
        '-q:v', '5', // Quality (2-31, lower is better)
        '-r', '15', // 15 FPS to reduce load
        '-s', '1280x720', // Resize to 720p
        '-an', // No audio
        '-'
      ]);

      activeStreams.set(streamId, ffmpeg);

      let buffer = Buffer.alloc(0);
      const JPEG_START = Buffer.from([0xFF, 0xD8]);
      const JPEG_END = Buffer.from([0xFF, 0xD9]);

      ffmpeg.stdout.on('data', (chunk: Buffer) => {
        buffer = Buffer.concat([buffer, chunk]);

        // Find complete JPEG frames
        let startIdx = buffer.indexOf(JPEG_START);
        while (startIdx !== -1) {
          const endIdx = buffer.indexOf(JPEG_END, startIdx + 2);
          if (endIdx === -1) break;

          // Extract complete JPEG frame
          const frame = buffer.slice(startIdx, endIdx + 2);
          const base64Frame = frame.toString('base64');

          // Send as SSE event
          const data = `data: ${JSON.stringify({ frame: base64Frame, timestamp: Date.now() })}\n\n`;
          controller.enqueue(new TextEncoder().encode(data));

          // Remove processed frame from buffer
          buffer = buffer.slice(endIdx + 2);
          startIdx = buffer.indexOf(JPEG_START);
        }

        // Prevent buffer from growing too large
        if (buffer.length > 1024 * 1024) {
          buffer = Buffer.alloc(0);
        }
      });

      ffmpeg.stderr.on('data', (data: Buffer) => {
        const msg = data.toString();
        // Only log errors, not progress
        if (msg.includes('Error') || msg.includes('error')) {
          console.error('FFmpeg:', msg);
        }
      });

      ffmpeg.on('error', (err) => {
        console.error('FFmpeg spawn error:', err);
        const errorData = `data: ${JSON.stringify({ error: err.message })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorData));
        controller.close();
        activeStreams.delete(streamId);
      });

      ffmpeg.on('close', (code) => {
        console.log(`FFmpeg closed with code ${code}`);
        activeStreams.delete(streamId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });

      // Handle client disconnect
      request.signal.addEventListener('abort', () => {
        console.log('Client disconnected, stopping FFmpeg');
        ffmpeg.kill('SIGTERM');
        activeStreams.delete(streamId);
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Stop stream endpoint
export async function DELETE(request: NextRequest) {
  const streamId = request.nextUrl.searchParams.get('id') || 'default';
  
  const ffmpeg = activeStreams.get(streamId);
  if (ffmpeg) {
    ffmpeg.kill('SIGTERM');
    activeStreams.delete(streamId);
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  
  return new Response(JSON.stringify({ success: false, error: 'Stream not found' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
