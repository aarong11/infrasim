import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Persistence file paths
const TOKEN_STORE_FILE = path.join(process.cwd(), '.tmp', 'token-store.json');

// Ensure .tmp directory exists
try {
  if (!fs.existsSync(path.dirname(TOKEN_STORE_FILE))) {
    fs.mkdirSync(path.dirname(TOKEN_STORE_FILE), { recursive: true });
  }
} catch (error) {
  console.warn('Could not create .tmp directory:', error);
}

// In-memory refresh token storage (in production, use database)
export const refreshTokenStore = new Map<string, {
  tokenId: string;
  address: string;
  expiresAt: number;
  isRevoked: boolean;
}>();

// JWT configuration
export const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

// Clean up expired refresh tokens
export const cleanupExpiredTokens = () => {
  const now = Date.now();
  for (const [key, value] of refreshTokenStore.entries()) {
    if (value.expiresAt < now || value.isRevoked) {
      refreshTokenStore.delete(key);
    }
  }
  saveTokenStore();
};

// Save token store to file
export const saveTokenStore = () => {
  try {
    const data = Array.from(refreshTokenStore.entries());
    fs.writeFileSync(TOKEN_STORE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Could not save token store:', error);
  }
};

// Load token store from file
export const loadTokenStore = () => {
  try {
    if (fs.existsSync(TOKEN_STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(TOKEN_STORE_FILE, 'utf-8'));
      refreshTokenStore.clear();
      for (const [key, value] of data) {
        refreshTokenStore.set(key, value);
      }
      console.log('Loaded token store with', refreshTokenStore.size, 'entries');
    }
  } catch (error) {
    console.warn('Could not load token store:', error);
  }
};

// Initialize token store
loadTokenStore();