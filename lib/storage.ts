/**
 * Session Storage Service
 * Uses MongoDB via API routes
 */

import { DetectionSession } from '@/types/session';
import { Insight } from '@/types/insight';

/**
 * Session document structure (matches MongoDB schema)
 */
export interface SessionDocument {
  _id: string;
  timestamp: string;
  duration: number;
  counts: {
    cars: number;
    truckBus: number;
    motorcycle: number;
  };
  totalVehicles: number;
  averageFps: number;
  insights: Array<{
    id: string;
    message: string;
    severity: 'info' | 'warning' | 'alert';
    timestamp: string;
  }>;
  videoInfo?: {
    fileName: string;
    fileSize: number;
    duration: number;
  };
  trackIds: number[];
  createdAt: string;
  updatedAt: string;
}

/**
 * API Response types
 */
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  total?: number;
  stats?: {
    totalVehicles: number;
    totalSessions: number;
  };
}

/**
 * Storage service class - MongoDB via API
 */
export class SessionStorage {
  private static baseUrl = '/api/sessions';

  /**
   * Save a new session to MongoDB
   */
  static async saveSession(session: {
    duration: number;
    counts: { cars: number; truckBus: number; motorcycle: number };
    totalVehicles: number;
    averageFps: number;
    insights: Insight[];
    videoInfo?: { fileName: string; fileSize: number; duration: number };
    trackIds: number[];
  }): Promise<string> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...session,
          insights: session.insights.map(insight => ({
            id: insight.id,
            message: insight.message,
            severity: insight.severity,
            timestamp: insight.timestamp.toISOString(),
          })),
        }),
      });

      const result: ApiResponse<SessionDocument> = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to save session');
      }

      console.log('✅ Session saved to MongoDB:', result.data._id);
      return result.data._id;
    } catch (error) {
      console.error('❌ Error saving session:', error);
      throw error;
    }
  }

  /**
   * Get all sessions from MongoDB
   */
  static async getAllSessions(): Promise<SessionDocument[]> {
    try {
      const response = await fetch(this.baseUrl);
      const result: ApiResponse<SessionDocument[]> = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch sessions');
      }

      return result.data || [];
    } catch (error) {
      console.error('❌ Error reading sessions:', error);
      return [];
    }
  }

  /**
   * Get session by ID
   */
  static async getSessionById(id: string): Promise<SessionDocument | null> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`);
      const result: ApiResponse<SessionDocument> = await response.json();

      if (!result.success) {
        return null;
      }

      return result.data || null;
    } catch (error) {
      console.error('❌ Error fetching session:', error);
      return null;
    }
  }

  /**
   * Convert SessionDocument to DetectionSession (for UI)
   */
  static toDetectionSession(doc: SessionDocument): DetectionSession {
    return {
      id: doc._id,
      timestamp: new Date(doc.timestamp),
      duration: doc.duration,
      counts: doc.counts,
      totalVehicles: doc.totalVehicles,
      averageFps: doc.averageFps,
      insights: doc.insights.map(insight => ({
        id: insight.id,
        message: insight.message,
        severity: insight.severity,
        timestamp: new Date(insight.timestamp),
      })),
    };
  }

  /**
   * Get all sessions as DetectionSession array
   */
  static async getAllDetectionSessions(): Promise<DetectionSession[]> {
    const docs = await this.getAllSessions();
    return docs.map(doc => this.toDetectionSession(doc));
  }

  /**
   * Delete session by ID
   */
  static async deleteSession(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/${id}`, {
        method: 'DELETE',
      });
      const result: ApiResponse<null> = await response.json();

      if (!result.success) {
        return false;
      }

      console.log('✅ Session deleted:', id);
      return true;
    } catch (error) {
      console.error('❌ Error deleting session:', error);
      return false;
    }
  }

  /**
   * Clear all sessions
   */
  static async clearAllSessions(): Promise<void> {
    try {
      const response = await fetch(this.baseUrl, {
        method: 'DELETE',
      });
      const result = await response.json();

      if (result.success) {
        console.log('✅ All sessions cleared');
      }
    } catch (error) {
      console.error('❌ Error clearing sessions:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static async getStats(): Promise<{
    totalSessions: number;
    totalVehicles: number;
  }> {
    try {
      const response = await fetch(this.baseUrl);
      const result: ApiResponse<SessionDocument[]> = await response.json();

      return result.stats || { totalSessions: 0, totalVehicles: 0 };
    } catch (error) {
      console.error('❌ Error getting stats:', error);
      return { totalSessions: 0, totalVehicles: 0 };
    }
  }
}
