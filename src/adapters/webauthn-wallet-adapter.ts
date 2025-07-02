import { ethers } from 'ethers';
import { SecureWebAuthnWallet } from '../components/SecureWebAuthnWallet';
import { useWalletStore, WebAuthnWallet } from '../store/wallet-store';
import { useAppStore } from '../store/app-store';

/**
 * WebAuthn Wallet Adapter
 * Bridges the existing SecureWebAuthnWallet with the unified wallet store
 */
export class WebAuthnWalletAdapter {
  private static instance: WebAuthnWalletAdapter;
  private secureWallet: SecureWebAuthnWallet;
  private provider: ethers.JsonRpcProvider | null = null;

  private constructor() {
    this.secureWallet = SecureWebAuthnWallet.getInstance();
    this.initializeProvider();
  }

  static getInstance(): WebAuthnWalletAdapter {
    if (!WebAuthnWalletAdapter.instance) {
      WebAuthnWalletAdapter.instance = new WebAuthnWalletAdapter();
    }
    return WebAuthnWalletAdapter.instance;
  }

  private initializeProvider(): void {
    try {
      this.provider = new ethers.JsonRpcProvider('http://localhost:8545');
    } catch (error) {
      console.error('Failed to initialize provider:', error);
    }
  }

  /**
   * Check if WebAuthn is supported
   */
  isWebAuthnSupported(): boolean {
    try {
      // Check if we're in a secure context (required for WebAuthn)
      if (!window.isSecureContext) {
        console.warn('WebAuthn requires a secure context (HTTPS or localhost)');
        return false;
      }
      
      // Check for basic WebAuthn support
      return !!(
        typeof window !== 'undefined' &&
        window.PublicKeyCredential && 
        navigator.credentials &&
        navigator.credentials.create &&
        navigator.credentials.get
      );
    } catch (error) {
      console.error('Error checking WebAuthn support:', error);
      return false;
    }
  }

  /**
   * Check if a WebAuthn wallet is registered
   */
  isWalletRegistered(): boolean {
    return this.secureWallet.isWalletRegistered();
  }

  /**
   * Register a new WebAuthn wallet and add it to the store
   */
  async registerWallet(): Promise<void> {
    const { walletTimeout } = useAppStore.getState();
    const { operations } = useWalletStore.getState();

    try {
      const walletData = await this.secureWallet.registerWebAuthnAndStoreWallet(walletTimeout);
      
      const webauthnWallet: WebAuthnWallet = {
        id: `webauthn-${Date.now()}`,
        type: 'webauthn',
        address: walletData.address,
        balance: '0.0',
        isConnected: true,
        isActive: true,
        isAuthenticated: true,
        isRegistered: true,
        timeRemaining: walletTimeout * 60,
        label: 'WebAuthn Wallet',
      };

      operations.addWallet(webauthnWallet);
      operations.setActiveWallet(webauthnWallet.id);
      operations.setConnection({
        provider: this.provider,
        isWebAuthnSupported: true,
        isConnected: true,
      });

      // Update balance
      await operations.updateBalance(webauthnWallet.id);
    } catch (error) {
      console.error('Failed to register WebAuthn wallet:', error);
      throw error;
    }
  }

  /**
   * Authenticate existing WebAuthn wallet
   */
  async authenticateWallet(): Promise<void> {
    const { walletTimeout } = useAppStore.getState();
    const { operations } = useWalletStore.getState();

    try {
      const walletData = await this.secureWallet.authenticateAndLoadWallet(walletTimeout);
      
      if (walletData) {
        const webauthnWallet: WebAuthnWallet = {
          id: `webauthn-${Date.now()}`,
          type: 'webauthn',
          address: walletData.address,
          balance: '0.0',
          isConnected: true,
          isActive: true,
          isAuthenticated: true,
          isRegistered: true,
          timeRemaining: walletTimeout * 60,
          label: 'WebAuthn Wallet',
        };

        operations.addWallet(webauthnWallet);
        operations.setActiveWallet(webauthnWallet.id);
        operations.setConnection({
          provider: this.provider,
          isWebAuthnSupported: true,
          isConnected: true,
        });

        // Update balance
        await operations.updateBalance(webauthnWallet.id);
      }
    } catch (error) {
      console.error('Failed to authenticate WebAuthn wallet:', error);
      throw error;
    }
  }

  /**
   * Send transaction using WebAuthn wallet
   */
  async sendTransaction(to: string, value: string): Promise<string> {
    const { operations } = useWalletStore.getState();
    const activeWallet = operations.getActiveWallet();

    if (!activeWallet || activeWallet.type !== 'webauthn') {
      throw new Error('No active WebAuthn wallet');
    }

    if (!this.provider) {
      throw new Error('Provider not initialized');
    }

    try {
      const currentWallet = this.secureWallet.getCurrentWallet();
      if (!currentWallet) {
        throw new Error('WebAuthn wallet not authenticated');
      }

      const ethersWallet = new ethers.Wallet(currentWallet.privateKey, this.provider);
      const tx = await ethersWallet.sendTransaction({
        to,
        value: ethers.parseEther(value),
      });

      // Update balance after transaction
      await operations.updateBalance(activeWallet.id);

      return tx.hash;
    } catch (error) {
      console.error('Failed to send transaction:', error);
      throw error;
    }
  }

  /**
   * Sign message using WebAuthn wallet
   */
  async signMessage(message: string): Promise<string> {
    const currentWallet = this.secureWallet.getCurrentWallet();
    if (!currentWallet) {
      throw new Error('WebAuthn wallet not authenticated');
    }

    try {
      const ethersWallet = new ethers.Wallet(currentWallet.privateKey);
      return await ethersWallet.signMessage(message);
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  /**
   * Disconnect WebAuthn wallet
   */
  disconnect(): void {
    const { operations } = useWalletStore.getState();
    const webauthnWallets = operations.getWalletsByType('webauthn');
    
    webauthnWallets.forEach(wallet => {
      operations.disconnectWallet(wallet.id);
    });

    this.secureWallet.clearDecryptedWallet();
  }

  /**
   * Clear all WebAuthn wallet data
   */
  clearWallet(): void {
    const { operations } = useWalletStore.getState();
    operations.clearWebAuthnWallet();
    this.secureWallet.clearAllWalletData();
  }

  /**
   * Get current WebAuthn wallet from secure storage
   */
  getCurrentWallet() {
    return this.secureWallet.getCurrentWallet();
  }

  /**
   * Update wallet timeout and time remaining
   */
  updateTimeRemaining(): void {
    const { operations } = useWalletStore.getState();
    const webauthnWallets = operations.getWalletsByType('webauthn');
    const currentWallet = this.secureWallet.getCurrentWallet();

    if (currentWallet && webauthnWallets.length > 0) {
      // Calculate time remaining (this is simplified - in real implementation,
      // you'd track the actual timeout from the secure wallet)
      const { walletTimeout } = useAppStore.getState();
      
      webauthnWallets.forEach(wallet => {
        const webauthnWallet = wallet as WebAuthnWallet;
        const newTimeRemaining = Math.max(0, webauthnWallet.timeRemaining - 1);
        
        operations.updateWallet(wallet.id, {
          timeRemaining: newTimeRemaining,
          isAuthenticated: newTimeRemaining > 0,
          isConnected: newTimeRemaining > 0,
        });

        if (newTimeRemaining <= 0) {
          operations.disconnectWallet(wallet.id);
        }
      });
    }
  }
}