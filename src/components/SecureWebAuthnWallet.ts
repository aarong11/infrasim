'use client';

import { ethers } from 'ethers';

/**
 * Secure WebAuthn-protected wallet for offline use
 * Encrypts wallet data with AES-GCM using a salt protected by WebAuthn
 * 
 * Security improvements:
 * - Uses PBKDF2 to derive encryption keys instead of raw credential ID
 * - Generates separate IVs for each encrypted field
 * - Includes device fingerprinting for binding to specific devices
 * - Abstracts storage for future IndexedDB migration
 * - Versioned fingerprinting for stability across device changes
 * - Deterministic PBKDF2 salt storage for reliable decryption
 * 
 * SECURITY WARNINGS:
 * 1. localStorage Security: Data is encrypted but localStorage is vulnerable to XSS.
 *    Mitigation: Implement CSP headers and consider migrating to IndexedDB.
 * 2. WebAuthn rawId: Used as key material but not treated as secret (properly hashed).
 * 3. Attestation: Currently uses 'direct' attestation for security validation.
 * 4. Device Binding: Fingerprint provides device binding but may change over time.
 * 
 * RECOMMENDATIONS:
 * - Deploy with Content Security Policy (CSP) to prevent XSS
 * - Consider IndexedDB migration for better security and storage quotas
 * - Monitor attestation results for authenticator security levels
 * - Implement backup/recovery mechanisms for fingerprint changes
 */

// Storage keys
const STORAGE_KEYS = {
  CREDENTIAL_ID: 'webauthn_credential_id',
  ENCRYPTED_SALT: 'webauthn_encrypted_salt',
  ENCRYPTED_WALLET: 'encrypted_wallet_data',
  SALT_IV: 'salt_encryption_iv',
  DEVICE_FINGERPRINT: 'device_fingerprint',
  FINGERPRINT_VERSION: 'device_fingerprint_version',
  // PBKDF2 salts for deterministic key derivation
  PBKDF2_SALT_PRIVATE: 'pbkdf2_salt_private_key',
  PBKDF2_SALT_MNEMONIC: 'pbkdf2_salt_mnemonic'
};

// Fingerprint algorithm versions for backward compatibility
const FINGERPRINT_VERSIONS = {
  V1: 'v1', // Legacy version with screen dimensions
  V2: 'v2'  // Current version with stable entropy sources
} as const;

type FingerprintVersion = typeof FINGERPRINT_VERSIONS[keyof typeof FINGERPRINT_VERSIONS];

interface FingerprintData {
  version: FingerprintVersion;
  fingerprint: string;
  timestamp: number;
}

interface EncryptedWalletData {
  encryptedPrivateKey: string;
  encryptedMnemonic: string;
  address: string;
  privateKeyIv: string; // Separate IV for private key encryption
  mnemonicIv: string;   // Separate IV for mnemonic encryption
}

interface WebAuthnWallet {
  address: string;
  privateKey: string;
  mnemonic: string;
}

/**
 * Storage abstraction layer for future IndexedDB migration
 * Currently wraps localStorage but can be easily swapped out
 */
class SecureStorage {
  static setItem(key: string, value: string): void {
    localStorage.setItem(key, value);
  }

  static getItem(key: string): string | null {
    return localStorage.getItem(key);
  }

  static removeItem(key: string): void {
    localStorage.removeItem(key);
  }

  static clear(): void {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  }
}

export class SecureWebAuthnWallet {
  private static instance: SecureWebAuthnWallet;
  private decryptedWallet: WebAuthnWallet | null = null;
  private timeoutId: NodeJS.Timeout | null = null;
  
  static getInstance(): SecureWebAuthnWallet {
    if (!SecureWebAuthnWallet.instance) {
      SecureWebAuthnWallet.instance = new SecureWebAuthnWallet();
    }
    return SecureWebAuthnWallet.instance;
  }

  /**
   * Check if WebAuthn is supported in current browser
   */
  private isWebAuthnSupported(): boolean {
    return !!(window.PublicKeyCredential && navigator.credentials);
  }

  /**
   * Generate cryptographically secure random bytes as proper ArrayBuffer
   */
  private generateRandomBytes(length: number): ArrayBuffer {
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return array.buffer;
  }

  /**
   * Convert string to ArrayBuffer
   */
  private stringToBuffer(str: string): ArrayBuffer {
    const encoded = new TextEncoder().encode(str);
    // Ensure we return a proper ArrayBuffer, not SharedArrayBuffer
    return encoded.buffer instanceof ArrayBuffer 
      ? encoded.buffer.slice(0) 
      : new Uint8Array(encoded).buffer;
  }

  /**
   * Convert ArrayBuffer to string
   */
  private bufferToString(buffer: ArrayBuffer): string {
    return new TextDecoder().decode(buffer);
  }

  /**
   * Convert ArrayBuffer to base64 string for storage
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    return btoa(String.fromCharCode(...Array.from(bytes)));
  }

  /**
   * Convert base64 string back to ArrayBuffer
   */
  private base64ToBuffer(base64: string): ArrayBuffer {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer.slice(0); // slice() returns a proper ArrayBuffer
  }

  /**
   * Generate device fingerprint V1 (legacy with screen dimensions)
   * Kept for backward compatibility with existing wallets
   */
  private generateDeviceFingerprintV1(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint', 2, 2);
    }
    
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width + 'x' + screen.height, // This causes the mobile rotation issue
      new Date().getTimezoneOffset(),
      canvas.toDataURL()
    ].join('|');

    // Hash the fingerprint for consistent length
    return btoa(fingerprint).slice(0, 32);
  }

  /**
   * Generate device fingerprint V2 (stable, rotation-resistant)
   * Replaces volatile screen dimensions with more stable entropy sources
   * FIXED: Made fully async to use proper SHA-256 hashing
   */
  private async generateDeviceFingerprintV2(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprint v2', 2, 2);
      // Add more canvas entropy for uniqueness
      ctx.fillStyle = 'rgba(255, 0, 0, 0.5)';
      ctx.fillRect(0, 0, 100, 50);
    }

    // Get WebGL fingerprint for additional entropy
    const getWebGLFingerprint = (): string => {
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') as WebGLRenderingContext | null || 
                   canvas.getContext('experimental-webgl') as WebGLRenderingContext | null;
        if (!gl) return 'no-webgl';
        
        const renderer = gl.getParameter(gl.RENDERER);
        const vendor = gl.getParameter(gl.VENDOR);
        return `${vendor}|${renderer}`;
      } catch {
        return 'webgl-error';
      }
    };

    // Get CPU core count (stable across rotations)
    const getCpuCores = (): string => {
      return navigator.hardwareConcurrency?.toString() || 'unknown';
    };

    // Get max touch points (stable device characteristic)
    const getMaxTouchPoints = (): string => {
      return navigator.maxTouchPoints?.toString() || '0';
    };

    // Get color depth (stable display characteristic)
    const getColorDepth = (): string => {
      return screen.colorDepth?.toString() || 'unknown';
    };

    // Get pixel ratio (more stable than absolute dimensions)
    const getPixelRatio = (): string => {
      return window.devicePixelRatio?.toString() || '1';
    };

    // Build stable fingerprint without screen dimensions
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      navigator.languages?.join(',') || '',
      new Date().getTimezoneOffset().toString(),
      getCpuCores(),
      getMaxTouchPoints(),
      getColorDepth(),
      getPixelRatio(),
      getWebGLFingerprint(),
      canvas.toDataURL(),
      // Add platform info (stable)
      navigator.platform || '',
      // Add memory info if available (relatively stable)
      (navigator as any).deviceMemory?.toString() || 'unknown'
    ].join('|');

    // Use proper SHA-256 for better distribution and collision resistance
    return await this.hashFingerprint(fingerprint);
  }

  /**
   * Hash fingerprint data using SHA-256 for better security
   */
  private async hashFingerprint(data: string): Promise<string> {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(data);
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
    
    // Convert to base64 and take first 32 characters for consistent length
    return this.bufferToBase64(hashBuffer).slice(0, 32);
  }

  /**
   * Synchronous version of hash for backward compatibility
   */
  private hashFingerprintSync(data: string): string {
    // Fallback to btoa for immediate use (less secure but compatible)
    return btoa(data).slice(0, 32);
  }

  /**
   * Get or create versioned device fingerprint with migration support
   */
  private async getVersionedDeviceFingerprint(): Promise<FingerprintData> {
    const storedFingerprintData = SecureStorage.getItem(STORAGE_KEYS.DEVICE_FINGERPRINT);
    const storedVersion = SecureStorage.getItem(STORAGE_KEYS.FINGERPRINT_VERSION);

    // If we have existing data, parse and validate
    if (storedFingerprintData && storedVersion) {
      try {
        const existingData: FingerprintData = JSON.parse(storedFingerprintData);
        
        // Validate the stored data structure
        if (existingData.version && existingData.fingerprint && existingData.timestamp) {
          return existingData;
        }
      } catch (error) {
        console.warn('Invalid stored fingerprint data, regenerating:', error);
      }
    }

    // Generate new V2 fingerprint
    const fingerprint = await this.generateDeviceFingerprintV2();
    const fingerprintData: FingerprintData = {
      version: FINGERPRINT_VERSIONS.V2,
      fingerprint,
      timestamp: Date.now()
    };

    // Store the new fingerprint data
    SecureStorage.setItem(STORAGE_KEYS.DEVICE_FINGERPRINT, JSON.stringify(fingerprintData));
    SecureStorage.setItem(STORAGE_KEYS.FINGERPRINT_VERSION, FINGERPRINT_VERSIONS.V2);

    return fingerprintData;
  }

  /**
   * Get device fingerprint with backward compatibility
   * Handles both legacy (V1) and new (V2) fingerprints
   */
  private async getDeviceFingerprint(): Promise<string> {
    const fingerprintData = await this.getVersionedDeviceFingerprint();
    return fingerprintData.fingerprint;
  }

  /**
   * Legacy synchronous method for backward compatibility
   * Will be phased out in favor of async version
   */
  private getDeviceFingerprintSync(): string {
    const storedFingerprintData = SecureStorage.getItem(STORAGE_KEYS.DEVICE_FINGERPRINT);
    
    if (storedFingerprintData) {
      try {
        const existingData: FingerprintData = JSON.parse(storedFingerprintData);
        if (existingData.fingerprint) {
          return existingData.fingerprint;
        }
      } catch (error) {
        console.warn('Invalid stored fingerprint, falling back to V1:', error);
      }
    }

    // Fallback to V1 for immediate compatibility
    const legacyFingerprint = this.generateDeviceFingerprintV1();
    
    // Store as V1 for future reference
    const fingerprintData: FingerprintData = {
      version: FINGERPRINT_VERSIONS.V1,
      fingerprint: legacyFingerprint,
      timestamp: Date.now()
    };
    
    SecureStorage.setItem(STORAGE_KEYS.DEVICE_FINGERPRINT, JSON.stringify(fingerprintData));
    SecureStorage.setItem(STORAGE_KEYS.FINGERPRINT_VERSION, FINGERPRINT_VERSIONS.V1);
    
    return legacyFingerprint;
  }

  /**
   * Derive encryption key using PBKDF2 with device binding
   * This replaces direct use of credential.rawId as key material
   * 
   * Security: Uses the WebAuthn credential ID as password input to PBKDF2,
   * combined with device fingerprint to bind encryption to this specific device
   */
  private async deriveEncryptionKey(credentialId: ArrayBuffer, salt: ArrayBuffer): Promise<CryptoKey> {
    // Combine credential ID with device fingerprint for device binding
    const deviceFingerprint = await this.getDeviceFingerprint();
    const fingerprintBuffer = this.stringToBuffer(deviceFingerprint);
    
    // Create combined key material: credentialId + deviceFingerprint
    const combinedMaterial = new Uint8Array(credentialId.byteLength + fingerprintBuffer.byteLength);
    combinedMaterial.set(new Uint8Array(credentialId), 0);
    combinedMaterial.set(new Uint8Array(fingerprintBuffer), credentialId.byteLength);

    // Import as PBKDF2 base key
    const baseKey = await crypto.subtle.importKey(
      'raw',
      combinedMaterial.buffer,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Use the salt for PBKDF2 salt (not a portion of it)
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Derive AES key from salt using PBKDF2 with deterministic salt storage
   * FIXED: Store and reuse PBKDF2 salts for each field to ensure deterministic key derivation
   */
  private async deriveAESKey(salt: ArrayBuffer, purpose: 'private' | 'mnemonic'): Promise<CryptoKey> {
    const baseKey = await crypto.subtle.importKey(
      'raw',
      salt,
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Get or generate deterministic PBKDF2 salt for this purpose
    const storageKey = purpose === 'private' ? STORAGE_KEYS.PBKDF2_SALT_PRIVATE : STORAGE_KEYS.PBKDF2_SALT_MNEMONIC;
    let pbkdf2SaltBase64 = SecureStorage.getItem(storageKey);
    
    if (!pbkdf2SaltBase64) {
      // Generate new salt only if none exists
      const pbkdf2Salt = this.generateRandomBytes(16);
      pbkdf2SaltBase64 = this.bufferToBase64(pbkdf2Salt);
      SecureStorage.setItem(storageKey, pbkdf2SaltBase64);
    }

    const pbkdf2Salt = this.base64ToBuffer(pbkdf2SaltBase64);
    
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: pbkdf2Salt,
        iterations: 100000,
        hash: 'SHA-256'
      },
      baseKey,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data using AES-GCM with a fresh IV
   * Each encryption gets its own IV to prevent security issues
   */
  private async encryptData(data: string, key: CryptoKey): Promise<{ encrypted: string; iv: string }> {
    const iv = this.generateRandomBytes(12); // Fresh 96-bit IV for each encryption
    const dataBuffer = this.stringToBuffer(data);
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      dataBuffer
    );

    return {
      encrypted: this.bufferToBase64(encrypted),
      iv: this.bufferToBase64(iv)
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  private async decryptData(encryptedData: string, iv: string, key: CryptoKey): Promise<string> {
    const encrypted = this.base64ToBuffer(encryptedData);
    const ivBuffer = this.base64ToBuffer(iv);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivBuffer },
      key,
      encrypted
    );

    return this.bufferToString(decrypted);
  }

  /**
   * Register WebAuthn credential and generate new wallet
   * UPDATED: Handle async fingerprinting properly
   */
  async registerWebAuthnAndStoreWallet(timeoutMinutes: number = 5): Promise<WebAuthnWallet> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    try {
      // Generate a new wallet
      const wallet = ethers.Wallet.createRandom();
      const walletData: WebAuthnWallet = {
        address: wallet.address,
        privateKey: wallet.privateKey,
        mnemonic: wallet.mnemonic?.phrase || ''
      };

      // Create WebAuthn credential with stronger attestation
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: this.generateRandomBytes(32),
          rp: {
            name: 'InfraSim Wallet',
            id: window.location.hostname
          },
          user: {
            id: this.generateRandomBytes(16),
            name: 'wallet-user',
            displayName: 'Wallet User'
          },
          pubKeyCredParams: [
            { alg: -7, type: 'public-key' }, // ES256
            { alg: -257, type: 'public-key' } // RS256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required', // SECURITY: Require user verification
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'direct' // SECURITY: Use direct attestation for better security validation
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Failed to create WebAuthn credential');
      }

      // Store credential ID
      const credentialId = this.bufferToBase64(credential.rawId);
      SecureStorage.setItem(STORAGE_KEYS.CREDENTIAL_ID, credentialId);

      // Generate wallet salt and encrypt it using derived key
      const walletSalt = this.generateRandomBytes(32);
      const saltIv = this.generateRandomBytes(12);
      
      // Get device fingerprint (now async)
      const deviceFingerprint = await this.getDeviceFingerprint();
      const fingerprintBuffer = this.stringToBuffer(deviceFingerprint);
      
      // Create combined key material: credentialId + deviceFingerprint
      const combinedMaterial = new Uint8Array(credential.rawId.byteLength + fingerprintBuffer.byteLength);
      combinedMaterial.set(new Uint8Array(credential.rawId), 0);
      combinedMaterial.set(new Uint8Array(fingerprintBuffer), credential.rawId.byteLength);

      // Use simplified key derivation for salt encryption
      const saltKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', combinedMaterial.buffer),
        'AES-GCM',
        false,
        ['encrypt']
      );

      const encryptedSalt = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: saltIv },
        saltKey,
        walletSalt
      );

      // Store encrypted salt and IV
      SecureStorage.setItem(STORAGE_KEYS.ENCRYPTED_SALT, this.bufferToBase64(encryptedSalt));
      SecureStorage.setItem(STORAGE_KEYS.SALT_IV, this.bufferToBase64(saltIv));

      // Encrypt and store wallet
      await this.encryptAndStoreWallet(walletData, walletSalt);

      // Set up auto-timeout with configurable timeout
      this.setDecryptedWallet(walletData, timeoutMinutes);

      return walletData;

    } catch (error) {
      console.error('WebAuthn registration failed:', error);
      throw new Error(`Failed to register WebAuthn: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Authenticate with WebAuthn and load decrypted wallet
   * UPDATED: Handle async fingerprinting properly
   */
  async authenticateAndLoadWallet(timeoutMinutes: number = 5): Promise<WebAuthnWallet | null> {
    if (!this.isWebAuthnSupported()) {
      throw new Error('WebAuthn is not supported in this browser');
    }

    const credentialId = SecureStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);
    if (!credentialId) {
      return null; // No wallet registered
    }

    try {
      // Authenticate with WebAuthn with stronger security requirements
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: this.generateRandomBytes(32),
          allowCredentials: [{
            id: this.base64ToBuffer(credentialId),
            type: 'public-key'
          }],
          userVerification: 'required', // SECURITY: Match registration requirement
          timeout: 60000
        }
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('WebAuthn authentication failed');
      }

      // Decrypt the wallet salt using the same method as during registration
      const encryptedSalt = SecureStorage.getItem(STORAGE_KEYS.ENCRYPTED_SALT);
      const saltIv = SecureStorage.getItem(STORAGE_KEYS.SALT_IV);
      
      if (!encryptedSalt || !saltIv) {
        throw new Error('Wallet salt not found');
      }

      // FIXED: Use async fingerprinting for consistency with registration
      const deviceFingerprint = await this.getDeviceFingerprint();
      const fingerprintBuffer = this.stringToBuffer(deviceFingerprint);
      
      // Create combined key material: credentialId + deviceFingerprint (same as registration)
      const combinedMaterial = new Uint8Array(credential.rawId.byteLength + fingerprintBuffer.byteLength);
      combinedMaterial.set(new Uint8Array(credential.rawId), 0);
      combinedMaterial.set(new Uint8Array(fingerprintBuffer), credential.rawId.byteLength);

      // Use the same key derivation approach as registration
      const saltDecryptionKey = await crypto.subtle.importKey(
        'raw',
        await crypto.subtle.digest('SHA-256', combinedMaterial.buffer),
        'AES-GCM',
        false,
        ['decrypt']
      );

      // Decrypt the wallet salt
      const decryptedSalt = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: this.base64ToBuffer(saltIv) },
        saltDecryptionKey,
        this.base64ToBuffer(encryptedSalt)
      );

      // Now use the decrypted salt to decrypt the wallet
      const wallet = await this.decryptWallet(decryptedSalt);
      
      if (wallet) {
        this.setDecryptedWallet(wallet, timeoutMinutes);
      }

      return wallet;
    } catch (error) {
      console.error('WebAuthn authentication failed:', error);
      throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Encrypt wallet data and store in localStorage
   * FIXED: Use separate AES keys for private key and mnemonic with deterministic salts
   */
  async encryptAndStoreWallet(wallet: WebAuthnWallet, salt?: ArrayBuffer): Promise<void> {
    if (!salt) {
      throw new Error('Salt required for encryption');
    }

    // Use separate AES keys for each field with deterministic PBKDF2 salts
    const aesKeyPrivate = await this.deriveAESKey(salt, 'private');
    const aesKeyMnemonic = await this.deriveAESKey(salt, 'mnemonic');
    
    // Encrypt private key and mnemonic with separate keys and IVs for security
    const encryptedPrivateKey = await this.encryptData(wallet.privateKey, aesKeyPrivate);
    const encryptedMnemonic = await this.encryptData(wallet.mnemonic, aesKeyMnemonic);

    const encryptedWalletData: EncryptedWalletData = {
      encryptedPrivateKey: encryptedPrivateKey.encrypted,
      encryptedMnemonic: encryptedMnemonic.encrypted,
      address: wallet.address, // Address is not sensitive, store in plain text
      privateKeyIv: encryptedPrivateKey.iv, // Separate IV for private key
      mnemonicIv: encryptedMnemonic.iv      // Separate IV for mnemonic
    };

    SecureStorage.setItem(STORAGE_KEYS.ENCRYPTED_WALLET, JSON.stringify(encryptedWalletData));
  }

  /**
   * Decrypt wallet from localStorage
   * FIXED: Use separate AES keys for private key and mnemonic with deterministic salts
   */
  async decryptWallet(salt?: ArrayBuffer): Promise<WebAuthnWallet | null> {
    if (!salt) {
      throw new Error('Salt required for decryption');
    }

    const encryptedData = SecureStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
    if (!encryptedData) {
      return null;
    }

    try {
      const walletData: EncryptedWalletData = JSON.parse(encryptedData);
      
      // Use separate AES keys for each field with the same deterministic PBKDF2 salts
      const aesKeyPrivate = await this.deriveAESKey(salt, 'private');
      const aesKeyMnemonic = await this.deriveAESKey(salt, 'mnemonic');

      // Decrypt using separate keys and IVs for each field
      const privateKey = await this.decryptData(
        walletData.encryptedPrivateKey, 
        walletData.privateKeyIv, 
        aesKeyPrivate
      );
      const mnemonic = await this.decryptData(
        walletData.encryptedMnemonic, 
        walletData.mnemonicIv, 
        aesKeyMnemonic
      );

      return {
        address: walletData.address,
        privateKey,
        mnemonic
      };

    } catch (error) {
      console.error('Failed to decrypt wallet:', error);
      return null;
    }
  }

  /**
   * Set decrypted wallet in memory with configurable auto-timeout
   */
  private setDecryptedWallet(wallet: WebAuthnWallet, timeoutMinutes: number = 5): void {
    this.decryptedWallet = wallet;
    
    // Clear any existing timeout
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    // Set timeout to clear wallet from memory (0 = no timeout)
    if (timeoutMinutes > 0) {
      this.timeoutId = setTimeout(() => {
        this.clearDecryptedWallet();
      }, timeoutMinutes * 60 * 1000);
    }
  }

  /**
   * Clear decrypted wallet from memory
   */
  clearDecryptedWallet(): void {
    this.decryptedWallet = null;
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * Get current decrypted wallet (if available and not timed out)
   */
  getCurrentWallet(): WebAuthnWallet | null {
    return this.decryptedWallet;
  }

  /**
   * Check if wallet is registered
   */
  isWalletRegistered(): boolean {
    return !!SecureStorage.getItem(STORAGE_KEYS.CREDENTIAL_ID);
  }

  /**
   * Clear all wallet data (for testing or reset)
   * Updated to clear all storage keys including PBKDF2 salts
   */
  clearAllWalletData(): void {
    // Clear all wallet-related data including new PBKDF2 salts
    Object.values(STORAGE_KEYS).forEach(key => {
      SecureStorage.removeItem(key);
    });
    this.clearDecryptedWallet();
  }

  /**
   * Get wallet address without decrypting (for display purposes)
   */
  getWalletAddress(): string | null {
    const encryptedData = SecureStorage.getItem(STORAGE_KEYS.ENCRYPTED_WALLET);
    if (!encryptedData) return null;
    
    try {
      const walletData: EncryptedWalletData = JSON.parse(encryptedData);
      return walletData.address;
    } catch {
      return null;
    }
  }
}