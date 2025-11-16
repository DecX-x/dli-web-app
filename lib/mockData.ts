import { Detection, VehicleCategory, BoundingBox } from '@/types/detection';
import { DetectionSession, VehicleCounts } from '@/types/session';
import { Insight, InsightSeverity } from '@/types/insight';

/**
 * Mock data generator for development and testing
 * Requirements: 1.1, 1.4, 3.1, 4.2
 */

// Vehicle categories with their relative probabilities
const VEHICLE_CATEGORIES: { category: VehicleCategory; weight: number }[] = [
  { category: 'cars', weight: 0.7 },
  { category: 'truck-bus', weight: 0.2 },
  { category: 'motorcycle', weight: 0.1 },
];

// Insight templates based on traffic patterns
const INSIGHT_TEMPLATES = {
  info: [
    'Traffic flow is normal across all lanes',
    'Vehicle distribution is balanced',
    'Average speed maintained at highway levels',
    'No unusual patterns detected',
    'Detection system operating at optimal performance',
  ],
  warning: [
    'Increased truck-bus traffic detected',
    'Vehicle density rising in monitored area',
    'Motorcycle activity higher than average',
    'Detection confidence slightly reduced due to lighting',
    'Traffic flow slowing in left lanes',
  ],
  alert: [
    'Heavy traffic congestion detected',
    'Unusual vehicle clustering observed',
    'Significant increase in vehicle count',
    'Multiple large vehicles in close proximity',
    'Traffic pattern anomaly detected',
  ],
};

/**
 * Generate a random vehicle category based on weighted probabilities
 */
function getRandomCategory(): VehicleCategory {
  const random = Math.random();
  let cumulative = 0;
  
  for (const { category, weight } of VEHICLE_CATEGORIES) {
    cumulative += weight;
    if (random <= cumulative) {
      return category;
    }
  }
  
  return 'cars';
}

/**
 * Generate a random bounding box within video dimensions
 * Assumes 1920x1080 video resolution
 */
function generateBoundingBox(category: VehicleCategory): BoundingBox {
  // Different size ranges for different vehicle types
  const sizeRanges = {
    cars: { minWidth: 80, maxWidth: 150, minHeight: 60, maxHeight: 100 },
    'truck-bus': { minWidth: 120, maxWidth: 250, minHeight: 100, maxHeight: 180 },
    motorcycle: { minWidth: 40, maxWidth: 80, minHeight: 50, maxHeight: 90 },
  };
  
  const range = sizeRanges[category];
  const width = Math.floor(Math.random() * (range.maxWidth - range.minWidth) + range.minWidth);
  const height = Math.floor(Math.random() * (range.maxHeight - range.minHeight) + range.minHeight);
  
  // Position within video bounds (1920x1080)
  const x = Math.floor(Math.random() * (1920 - width));
  const y = Math.floor(Math.random() * (1080 - height));
  
  return { x, y, width, height };
}

/**
 * Generate a single random detection
 * Requirements: 1.1, 1.2
 */
export function generateDetection(): Detection {
  const category = getRandomCategory();
  const bbox = generateBoundingBox(category);
  const confidence = Math.random() * 0.15 + 0.85; // 0.85 to 1.0
  
  return {
    id: `det_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    bbox,
    category,
    confidence: Math.round(confidence * 100) / 100,
    timestamp: Date.now(),
  };
}

/**
 * Generate multiple random detections (10-15 per frame)
 * Requirements: 1.1, 1.4
 */
export function generateDetections(): Detection[] {
  const count = Math.floor(Math.random() * 6) + 10; // 10-15 detections
  return Array.from({ length: count }, () => generateDetection());
}

/**
 * Generate an AI insight based on traffic patterns
 * Requirements: 3.1
 */
export function generateInsight(counts: VehicleCounts): Insight {
  const total = counts.cars + counts.truckBus + counts.motorcycle;
  let severity: InsightSeverity = 'info';
  
  // Determine severity based on traffic patterns
  if (total > 500) {
    severity = 'alert';
  } else if (total > 300 || counts.truckBus > 100) {
    severity = 'warning';
  }
  
  // Select random message template
  const templates = INSIGHT_TEMPLATES[severity];
  const message = templates[Math.floor(Math.random() * templates.length)];
  
  return {
    id: `insight_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    message,
    timestamp: new Date(),
    severity,
  };
}

/**
 * Generate a random historical detection session
 * Requirements: 4.2
 */
export function generateSession(timestamp?: Date): DetectionSession {
  const sessionTimestamp = timestamp || new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000);
  const duration = Math.floor(Math.random() * 3600) + 300; // 5-65 minutes in seconds
  
  // Generate realistic vehicle counts
  const cars = Math.floor(Math.random() * 400) + 100;
  const truckBus = Math.floor(Math.random() * 100) + 20;
  const motorcycle = Math.floor(Math.random() * 50) + 5;
  
  const counts: VehicleCounts = { cars, truckBus, motorcycle };
  const totalVehicles = cars + truckBus + motorcycle;
  const averageFps = Math.random() * 3 + 12; // 12-15 FPS
  
  // Generate 3-8 insights for the session
  const insightCount = Math.floor(Math.random() * 6) + 3;
  const insights: Insight[] = Array.from({ length: insightCount }, (_, i) => {
    const insightTimestamp = new Date(sessionTimestamp.getTime() + (duration * 1000 * i) / insightCount);
    return {
      ...generateInsight(counts),
      timestamp: insightTimestamp,
    };
  });
  
  return {
    id: `session_${sessionTimestamp.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: sessionTimestamp,
    duration,
    counts,
    totalVehicles,
    averageFps: Math.round(averageFps * 10) / 10,
    insights,
  };
}

/**
 * Generate multiple historical sessions
 * Requirements: 4.2
 */
export function generateHistoricalSessions(count: number = 20): DetectionSession[] {
  return Array.from({ length: count }, (_, i) => {
    // Generate sessions spread over the last 30 days
    const daysAgo = Math.floor((i / count) * 30);
    const timestamp = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);
    return generateSession(timestamp);
  }).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

/**
 * Create a detection stream generator that produces detections at 10-15 FPS
 * Requirements: 1.1, 1.4
 */
export function createDetectionStream(
  onDetections: (detections: Detection[]) => void,
  fps: number = 12
): () => void {
  const interval = 1000 / fps;
  const intervalId = setInterval(() => {
    const detections = generateDetections();
    onDetections(detections);
  }, interval);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Create an insight generator that produces insights periodically
 * Requirements: 3.1
 */
export function createInsightStream(
  onInsight: (insight: Insight) => void,
  counts: () => VehicleCounts,
  intervalSeconds: number = 30
): () => void {
  const intervalId = setInterval(() => {
    const currentCounts = counts();
    const insight = generateInsight(currentCounts);
    onInsight(insight);
  }, intervalSeconds * 1000);
  
  // Return cleanup function
  return () => clearInterval(intervalId);
}
