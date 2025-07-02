/**
 * Shared nonce storage for wallet authentication
 * In production, this should be replaced with Redis or a database
 */

interface NonceData {
  nonce: string;
  expiresAt: Date;
}

class NonceStore {
  private store = new Map<string, NonceData>();

  constructor() {
    // Clean up expired nonces every minute
    setInterval(() => {
      const now = new Date();
      for (const [wallet, data] of this.store.entries()) {
        if (data.expiresAt < now) {
          this.store.delete(wallet);
        }
      }
    }, 60000);
  }

  set(wallet: string, nonce: string, expiresAt: Date): void {
    this.store.set(wallet.toLowerCase(), { nonce, expiresAt });
  }

  get(wallet: string): NonceData | undefined {
    return this.store.get(wallet.toLowerCase());
  }

  delete(wallet: string): boolean {
    return this.store.delete(wallet.toLowerCase());
  }

  has(wallet: string): boolean {
    return this.store.has(wallet.toLowerCase());
  }
}

// Export singleton instance
export const nonceStore = new NonceStore();