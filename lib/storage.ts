/**
 * LocalStorage service for detection sessions
 * Mimics MongoDB document structure for easy migration
 */

import { DetectionSession } from '@/types/session';
import { Insight } from '@/types/insight';

const STORAGE_KEY = 'vehicle_detection_sessions';
const MAX_SESSIONS = 100; // Limit storage size

/**
 * Session document structure (MongoDB-like)
 */
export interface SessionDocument {
  _id: string; // MongoDB-style ID
  timestamp: string; // ISO string for serialization
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
  trackIds: number[]; // List of unique track IDs seen
  createdAt: string;
  updatedAt: string;
}

/**
 * Storage service class
 */
export class SessionStorage {
  /**
   * Save a new session to localStorage
   */
  static saveSession(session: {
    duration: number;
    counts: { cars: number; truckBus: number; motorcycle: number };
    totalVehicles: number;
    averageFps: number;
    insights: Insight[];
    videoInfo?: { fileName: string; fileSize: number; duration: number };
    trackIds: number[];
  }): string {
    try {
      const sessions = this.getAllSessions();
      
      // Create MongoDB-style document
      const now = new Date().toISOString();
      const sessionDoc: SessionDocument = {
        _id: this.generateId(),
        timestamp: now,
        duration: session.duration,
        counts: session.counts,
        totalVehicles: session.totalVehicles,
        averageFps: session.averageFps,
        insights: session.insights.map(insight => ({
          id: insight.id,
          message: insight.message,
          severity: insight.severity,
          timestamp: insight.timestamp.toISOString(),
        })),
        videoInfo: session.videoInfo,
        trackIds: session.trackIds,
        createdAt: now,
        updatedAt: now,
      };

      // Add to sessions array
      sessions.unshift(sessionDoc); // Add to beginning (newest first)

      // Limit storage size
      if (sessions.length > MAX_SESSIONS) {
        sessions.splice(MAX_SESSIONS);
      }

      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
      
      console.log('✅ Session saved to localStorage:', sessionDoc._id);
      return sessionDoc._id;
    } catch (error) {
      console.error('❌ Error saving session:', error);
      throw error;
    }
  }

  /**
   * Get all sessions from localStorage
   */
  static getAllSessions(): SessionDocument[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return [];
      
      return JSON.parse(data);
    } catch (error) {
      console.error('❌ Error reading sessions:', error);
      return [];
    }
  }

  /**
   * Get session by ID
   */
  static getSessionById(id: string): SessionDocument | null {
    const sessions = this.getAllSessions();
    return sessions.find(s => s._id === id) || null;
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
  static getAllDetectionSessions(): DetectionSession[] {
    const docs = this.getAllSessions();
    return docs.map(doc => this.toDetectionSession(doc));
  }

  /**
   * Delete session by ID
   */
  static deleteSession(id: string): boolean {
    try {
      const sessions = this.getAllSessions();
      const filtered = sessions.filter(s => s._id !== id);
      
      if (filtered.length === sessions.length) {
        return false; // Session not found
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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
  static clearAllSessions(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log('✅ All sessions cleared');
    } catch (error) {
      console.error('❌ Error clearing sessions:', error);
    }
  }

  /**
   * Get storage statistics
   */
  static getStats(): {
    totalSessions: number;
    totalVehicles: number;
    storageSize: number;
  } {
    const sessions = this.getAllSessions();
    const totalVehicles = sessions.reduce((sum, s) => sum + s.totalVehicles, 0);
    const storageSize = new Blob([localStorage.getItem(STORAGE_KEY) || '']).size;

    return {
      totalSessions: sessions.length,
      totalVehicles,
      storageSize,
    };
  }

  /**
   * Generate MongoDB-style ObjectId
   */
  private static generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Math.random().toString(16).substring(2, 18);
    return timestamp + random;
  }

  /**
   * Query sessions (MongoDB-like)
   */
  static query(filter: {
    startDate?: Date;
    endDate?: Date;
    minVehicles?: number;
    maxVehicles?: number;
  }): SessionDocument[] {
    let sessions = this.getAllSessions();

    if (filter.startDate) {
      sessions = sessions.filter(s => new Date(s.timestamp) >= filter.startDate!);
    }

    if (filter.endDate) {
      sessions = sessions.filter(s => new Date(s.timestamp) <= filter.endDate!);
    }

    if (filter.minVehicles !== undefined) {
      sessions = sessions.filter(s => s.totalVehicles >= filter.minVehicles!);
    }

    if (filter.maxVehicles !== undefined) {
      sessions = sessions.filter(s => s.totalVehicles <= filter.maxVehicles!);
    }

    return sessions;
  }
}
