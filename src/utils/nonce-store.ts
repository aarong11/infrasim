import fs from 'fs';
import path from 'path';

// Persistence file paths
const NONCE_STORE_FILE = path.join(process.cwd(), '.tmp', 'nonce-store.json');
const TOKEN_STORE_FILE = path.join(process.cwd(), '.tmp', 'token-store.json');

// Ensure .tmp directory exists
try {
  if (!fs.existsSync(path.dirname(NONCE_STORE_FILE))) {
    fs.mkdirSync(path.dirname(NONCE_STORE_FILE), { recursive: true });
  }
} catch (error) {
  console.warn('Could not create .tmp directory:', error);
}

// In-memory nonce storage (in production, use Redis or database)
export const nonceStore = new Map<string, { nonce: string; timestamp: number; used: boolean }>();

// Clean up expired nonces (older than 5 minutes)
export const cleanupExpiredNonces = () => {
  const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
  for (const [key, value] of nonceStore.entries()) {
    if (value.timestamp < fiveMinutesAgo) {
      nonceStore.delete(key);
    }
  }
  saveNonceStore();
};

// Save nonce store to file
export const saveNonceStore = () => {
  try {
    const data = Array.from(nonceStore.entries());
    fs.writeFileSync(NONCE_STORE_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.warn('Could not save nonce store:', error);
  }
};

// Load nonce store from file
export const loadNonceStore = () => {
  try {
    if (fs.existsSync(NONCE_STORE_FILE)) {
      const data = JSON.parse(fs.readFileSync(NONCE_STORE_FILE, 'utf-8'));
      nonceStore.clear();
      for (const [key, value] of data) {
        nonceStore.set(key, value);
      }
      console.log('Loaded nonce store with', nonceStore.size, 'entries');
    }
  } catch (error) {
    console.warn('Could not load nonce store:', error);
  }
};

// Initialize nonce store
loadNonceStore();