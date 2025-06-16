// API configuration for Cloudflare deployment
export const API_CONFIG = {
  // Base URL for API calls - will be replaced by environment variable in production
  baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
  
  // API endpoints
  endpoints: {
    vectorMemory: '/api/vector-memory',
    health: '/api/health'
  },
  
  // Default request options
  defaultOptions: {
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  }
};

// Helper function to build full API URLs
export const buildApiUrl = (endpoint: string): string => {
  return `${API_CONFIG.baseUrl}${endpoint}`;
};

// Environment detection
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

// Cloudflare-specific configuration
export const CLOUDFLARE_CONFIG = {
  workerDomain: process.env.NEXT_PUBLIC_WORKER_DOMAIN || 'your-worker-domain.workers.dev',
  pagesDomain: process.env.NEXT_PUBLIC_PAGES_DOMAIN || 'your-pages-domain.pages.dev',
};