import { VehicleCategory } from './detection';
import { Insight } from './insight';

/**
 * Vehicle counts by category
 * Requirements: 2.1, 4.3
 */
export interface VehicleCounts {
  cars: number;
  truckBus: number;
  motorcycle: number;
}

/**
 * Detection session data structure for historical records
 * Requirements: 4.3
 */
export interface DetectionSession {
  id: string;
  timestamp: Date;
  duration: number;
  counts: VehicleCounts;
  totalVehicles: number;
  averageFps: number;
  insights: Insight[];
}
