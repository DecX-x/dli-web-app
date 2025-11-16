'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, X, Play, Pause } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoUploadProps {
  onFileSelect: (file: File) => void;
  onStart: () => void;
  onStop: () => void;
  isProcessing: boolean;
  progress: number;
  disabled?: boolean;
}

export function VideoUpload({
  onFileSelect,
  onStart,
  onStop,
  isProcessing,
  progress,
  disabled = false
}: VideoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      onFileSelect(file);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      {/* File Input */}
      {!selectedFile && (
        <div
          className={cn(
            'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary hover:bg-accent'
          )}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Upload Video File</p>
          <p className="text-xs text-muted-foreground mt-1">
            Click to select or drag and drop
          </p>
          <p className="text-xs text-muted-foreground">MP4, AVI, MOV (max 100MB)</p>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            className="hidden"
            disabled={disabled}
          />
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isProcessing}
              className="flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Bar */}
          {isProcessing && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing...</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex gap-2">
            {!isProcessing ? (
              <Button
                onClick={onStart}
                className="flex-1 gap-2"
                size="sm"
              >
                <Play className="h-4 w-4" />
                Start Detection
              </Button>
            ) : (
              <Button
                onClick={onStop}
                variant="destructive"
                className="flex-1 gap-2"
                size="sm"
              >
                <Pause className="h-4 w-4" />
                Stop
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
