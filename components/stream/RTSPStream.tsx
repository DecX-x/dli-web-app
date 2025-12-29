'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, Radio, Settings, Camera, MapPin } from 'lucide-react';

// Dummy camera list with street names
const CAMERAS = [
  {
    id: 1,
    name: 'Camera 1',
    street: 'Jl. Sudirman',
    rtspUrl: 'rtsp://localhost:8554/stream',
    isReal: true,
  },
  {
    id: 2,
    name: 'Camera 2',
    street: 'Jl. Thamrin',
    rtspUrl: 'rtsp://localhost:8554/camera2',
    isReal: false,
  },
  {
    id: 3,
    name: 'Camera 3',
    street: 'Jl. Gatot Subroto',
    rtspUrl: 'rtsp://localhost:8554/camera3',
    isReal: false,
  },
];

interface RTSPStreamProps {
  onStart: (rtspUrl: string, cameraName: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  defaultUrl?: string;
}

/**
 * RTSP Stream Control Component
 * Camera selector with dummy street names
 */
export function RTSPStream({
  onStart,
  onStop,
  isStreaming,
  disabled = false,
}: RTSPStreamProps) {
  const [selectedCamera, setSelectedCamera] = useState(CAMERAS[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [customUrl, setCustomUrl] = useState('');

  const handleStart = () => {
    const url = customUrl.trim() || selectedCamera.rtspUrl;
    const name = customUrl.trim() ? 'Custom Stream' : `${selectedCamera.name} - ${selectedCamera.street}`;
    onStart(url, name);
  };

  const handleStop = () => {
    onStop();
  };

  const handleCameraSelect = (camera: typeof CAMERAS[0]) => {
    setSelectedCamera(camera);
    setCustomUrl('');
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 lg:p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Radio className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Live Stream</span>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="p-1 hover:bg-muted rounded"
          aria-label="Toggle settings"
        >
          <Settings className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {/* Camera Selector */}
      <div className="mb-3">
        <label className="text-xs text-muted-foreground mb-2 block">
          Select Camera
        </label>
        <div className="space-y-2">
          {CAMERAS.map((camera) => (
            <button
              key={camera.id}
              onClick={() => handleCameraSelect(camera)}
              disabled={isStreaming || disabled}
              className={`w-full flex items-center gap-3 p-2 rounded-md border text-left transition-colors ${
                selectedCamera.id === camera.id
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted'
              } ${(isStreaming || disabled) ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Camera className={`h-4 w-4 ${selectedCamera.id === camera.id ? 'text-primary' : 'text-muted-foreground'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{camera.name}</span>
                  {camera.isReal && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded">
                      LIVE
                    </span>
                  )}
                  {!camera.isReal && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted text-muted-foreground rounded">
                      DEMO
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{camera.street}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Custom RTSP URL (collapsible) */}
      {showSettings && (
        <div className="mb-3">
          <label className="text-xs text-muted-foreground mb-1 block">
            Custom RTSP URL (optional)
          </label>
          <Input
            type="text"
            value={customUrl}
            onChange={(e) => setCustomUrl(e.target.value)}
            placeholder="rtsp://..."
            disabled={isStreaming || disabled}
            className="text-xs h-8"
          />
        </div>
      )}

      {/* Stream Status */}
      <div className="flex items-center gap-2 mb-3 text-xs">
        <div
          className={`w-2 h-2 rounded-full ${
            isStreaming ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground'
          }`}
        />
        <span className="text-muted-foreground">
          {isStreaming ? `Streaming ${selectedCamera.name}...` : 'Ready to stream'}
        </span>
      </div>

      {/* Control Buttons */}
      {!isStreaming ? (
        <Button
          onClick={handleStart}
          disabled={disabled}
          className="w-full gap-2"
          size="sm"
        >
          <Play className="h-4 w-4" />
          Start Stream
        </Button>
      ) : (
        <Button
          onClick={handleStop}
          variant="destructive"
          className="w-full gap-2"
          size="sm"
        >
          <Square className="h-4 w-4" />
          Stop Stream
        </Button>
      )}

      {/* Connection hint */}
      {disabled && (
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Connect to backend first
        </p>
      )}
    </div>
  );
}
