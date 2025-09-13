// server/analytics-store.js
// Simple in-memory analytics tracking for design views and conversions.

const analytics = new Map(); // designId -> { views:number, conversions:number }

export function recordView(designId) {
  const rec = analytics.get(String(designId)) || { views: 0, conversions: 0 };
  rec.views += 1;
  analytics.set(String(designId), rec);
}

export function recordConversion(designId) {
  const rec = analytics.get(String(designId)) || { views: 0, conversions: 0 };
  rec.conversions += 1;
  analytics.set(String(designId), rec);
}

export function getPopularDesigns(limit = 10) {
  return Array.from(analytics.entries())
    .sort((a, b) => b[1].views - a[1].views)
    .slice(0, limit)
    .map(([designId, stats]) => ({ designId, views: stats.views, conversions: stats.conversions }));
}

export function getConversionRates() {
  return Array.from(analytics.entries()).map(([designId, stats]) => ({
    designId,
    views: stats.views,
    conversions: stats.conversions,
    rate: stats.views ? stats.conversions / stats.views : 0
  }));
}

export default {
  recordView,
  recordConversion,
  getPopularDesigns,
  getConversionRates
};
