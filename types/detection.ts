/**
 * Vehicle category types for classification
 * Requirements: 1.2, 2.1
 */
export type VehicleCategory = 'cars' | 'truck-bus' | 'motorcycle';

/**
 * Bounding box coordinates for vehicle detection
 * Requirements: 1.2
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Vehicle detection data structure
 * Requirements: 1.2, 2.1
 */
export interface Detection {
  id: string;
  bbox: BoundingBox;
  category: VehicleCategory;
  confidence: number;
  timestamp: number;
  track_id?: number; // Optional track ID from backend
}

/**
 * Convert backend detection to frontend format
 */
export function convertBackendDetection(
  backendDet: {
    track_id: number;
    vehicle_type: string;
    coordinates: { x1: number; y1: number; x2: number; y2: number };
  },
  timestamp: number
): Detection {
  // Normalize vehicle type (case-insensitive, handle variations)
  const vehicleType = backendDet.vehicle_type.toLowerCase().trim();
  
  // Map vehicle_type to VehicleCategory
  let category: VehicleCategory = 'cars';
  
  // Check for truck/bus variations
  if (vehicleType.includes('truck') || vehicleType.includes('bus')) {
    category = 'truck-bus';
  } 
  // Check for motorcycle variations
  else if (vehicleType.includes('motorcycle') || vehicleType.includes('bike')) {
    category = 'motorcycle';
  }
  // Default to car
  else {
    category = 'cars';
  }

  return {
    id: `track-${backendDet.track_id}-${timestamp}`,
    bbox: {
      x: backendDet.coordinates.x1,
      y: backendDet.coordinates.y1,
      width: backendDet.coordinates.x2 - backendDet.coordinates.x1,
      height: backendDet.coordinates.y2 - backendDet.coordinates.y1,
    },
    category,
    confidence: 0.9, // Backend doesn't provide confidence, use default
    timestamp,
    track_id: backendDet.track_id,
  };
}
