/**
 * AI Insights Service
 * Connects to backend /insights endpoint for traffic analysis
 */

import { VehicleCounts } from '@/types/session';
import { Insight, InsightSeverity } from '@/types/insight';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Input data for AI insights
 */
export interface InsightRequest {
  counts: {
    cars: number;
    truckBus: number;
    motorcycle: number;
  };
  totalVehicles: number;
  duration: number;
  fps: number;
  timestamp: string;
}

/**
 * Response from AI insights API (backend wrapper)
 */
export interface BackendInsightResponse {
  success: boolean;
  insight: string; // May contain markdown code block
  input_data?: InsightRequest;
}

/**
 * Parsed insight data
 */
export interface InsightResponse {
  message: string;
  severity: 'info' | 'warning' | 'alert';
  category: 'traffic_flow' | 'safety' | 'congestion' | 'anomaly' | 'composition';
}

/**
 * Parse insight from backend response
 * Backend may return JSON wrapped in markdown code blocks
 */
function parseInsightFromResponse(insightStr: string): InsightResponse {
  // Remove markdown code blocks if present
  let cleanJson = insightStr.trim();
  
  // Remove ```json ... ``` wrapper
  if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }
  
  try {
    return JSON.parse(cleanJson);
  } catch {
    // If parsing fails, return a default insight with the raw message
    return {
      message: insightStr,
      severity: 'info',
      category: 'traffic_flow',
    };
  }
}

/**
 * Generate unique ID for insight
 */
function generateInsightId(): string {
  return `insight-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get AI insight from backend (sync version)
 */
export async function getAIInsight(
  counts: VehicleCounts,
  duration: number,
  fps: number
): Promise<Insight> {
  const totalVehicles = counts.cars + counts.truckBus + counts.motorcycle;
  
  const requestBody: InsightRequest = {
    counts: {
      cars: counts.cars,
      truckBus: counts.truckBus,
      motorcycle: counts.motorcycle,
    },
    totalVehicles,
    duration,
    fps,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/insights/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const backendResponse: BackendInsightResponse = await response.json();
    
    // Check if backend returned success
    if (!backendResponse.success || !backendResponse.insight) {
      throw new Error('Backend returned unsuccessful response');
    }
    
    // Parse the insight from the response (handles markdown code blocks)
    const data = parseInsightFromResponse(backendResponse.insight);
    
    console.log('✅ Parsed AI insight:', data);

    return {
      id: generateInsightId(),
      message: data.message,
      severity: data.severity as InsightSeverity,
      timestamp: new Date(),
      category: data.category,
    };
  } catch (error) {
    console.error('❌ Error getting AI insight:', error);
    
    // Fallback to local insight generation
    return generateFallbackInsight(counts, totalVehicles);
  }
}

/**
 * Get AI insight with streaming (for real-time updates)
 */
export async function getAIInsightStreaming(
  counts: VehicleCounts,
  duration: number,
  fps: number,
  onChunk: (text: string) => void
): Promise<Insight> {
  const totalVehicles = counts.cars + counts.truckBus + counts.motorcycle;
  
  const requestBody: InsightRequest = {
    counts: {
      cars: counts.cars,
      truckBus: counts.truckBus,
      motorcycle: counts.motorcycle,
    },
    totalVehicles,
    duration,
    fps,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(`${API_BASE_URL}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullText = '';

    if (reader) {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        fullText += chunk;
        onChunk(chunk);
      }
    }

    // Parse the complete response
    try {
      const data: InsightResponse = JSON.parse(fullText);
      return {
        id: generateInsightId(),
        message: data.message,
        severity: data.severity as InsightSeverity,
        timestamp: new Date(),
        category: data.category,
      };
    } catch {
      // If not valid JSON, use the text as message
      return {
        id: generateInsightId(),
        message: fullText,
        severity: 'info',
        timestamp: new Date(),
      };
    }
  } catch (error) {
    console.error('❌ Error getting streaming AI insight:', error);
    return generateFallbackInsight(counts, totalVehicles);
  }
}

/**
 * Fallback insight generation when API is unavailable
 */
function generateFallbackInsight(counts: VehicleCounts, totalVehicles: number): Insight {
  const { cars, truckBus, motorcycle } = counts;
  
  let message: string;
  let severity: InsightSeverity = 'info';
  let category: 'traffic_flow' | 'safety' | 'congestion' | 'anomaly' | 'composition' = 'traffic_flow';

  // High traffic
  if (totalVehicles > 100) {
    message = `High traffic volume detected: ${totalVehicles} vehicles. Consider traffic management measures.`;
    severity = 'warning';
    category = 'congestion';
  }
  // High truck ratio
  else if (truckBus > 0 && (truckBus / totalVehicles) > 0.4) {
    const truckPercent = Math.round((truckBus / totalVehicles) * 100);
    message = `Heavy truck traffic (${truckPercent}%) may slow overall flow. Monitor lane speeds.`;
    severity = 'warning';
    category = 'composition';
  }
  // High motorcycle ratio
  else if (motorcycle > 0 && (motorcycle / totalVehicles) > 0.5) {
    const motoPercent = Math.round((motorcycle / totalVehicles) * 100);
    message = `High motorcycle density (${motoPercent}%). Recommend speed monitoring for safety.`;
    severity = 'warning';
    category = 'safety';
  }
  // Normal flow
  else {
    message = `Traffic flowing normally with ${cars} cars, ${truckBus} trucks/buses, and ${motorcycle} motorcycles.`;
    severity = 'info';
    category = 'traffic_flow';
  }

  return {
    id: generateInsightId(),
    message,
    severity,
    timestamp: new Date(),
    category,
  };
}

/**
 * AI Insights service class for easier usage
 */
export class AIInsightsService {
  private apiUrl: string;
  
  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || API_BASE_URL;
  }

  async getInsight(counts: VehicleCounts, duration: number, fps: number): Promise<Insight> {
    return getAIInsight(counts, duration, fps);
  }

  async getInsightStreaming(
    counts: VehicleCounts,
    duration: number,
    fps: number,
    onChunk: (text: string) => void
  ): Promise<Insight> {
    return getAIInsightStreaming(counts, duration, fps, onChunk);
  }
}

export default new AIInsightsService();
