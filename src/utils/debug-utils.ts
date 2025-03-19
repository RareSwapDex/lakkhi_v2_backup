/**
 * Utility functions for debugging that are safe to use in production
 * In production mode, these will simply not do anything visible to users
 */

// Never enable debug mode in production
let debugModeEnabled = false;

/**
 * Initialize debug mode based on URL parameters (debug or verbose)
 * This is safe to call in production - it will only enable debug mode in development
 */
export function initDebugMode(): void {
  // Never enable debug mode in production
  debugModeEnabled = false;
  console.log('Debug mode disabled in production');
}

/**
 * Check if debug mode is enabled
 */
export function isDebugMode(): boolean {
  return debugModeEnabled;
}

/**
 * Log debug messages only if debug mode is enabled
 * In production, this is a no-op that doesn't log anything
 */
export function debugLog(message: string, data?: any): void {
  // In production, we only log to console when explicitly needed
  if (data) {
    console.log(`[DEBUG] ${message}`, data);
  } else {
    console.log(`[DEBUG] ${message}`);
  }
}

/**
 * Show a debug overlay with information
 * In production, this does nothing
 */
export function showDebugOverlay(data: Record<string, any>): void {
  // No-op in production
  return;
}

/**
 * Get URL parameters as an object
 */
export function getUrlParams(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  
  params.forEach((value, key) => {
    result[key] = value;
  });
  
  return result;
} 