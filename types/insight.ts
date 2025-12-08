/**
 * AI insight severity levels
 * Requirements: 3.1
 */
export type InsightSeverity = 'info' | 'warning' | 'alert';

/**
 * AI insight category types
 */
export type InsightCategory = 'traffic_flow' | 'safety' | 'congestion' | 'anomaly' | 'composition';

/**
 * AI-generated traffic insight data structure
 * Requirements: 3.1
 */
export interface Insight {
  id: string;
  message: string;
  timestamp: Date;
  severity: InsightSeverity;
  category?: InsightCategory;
}
