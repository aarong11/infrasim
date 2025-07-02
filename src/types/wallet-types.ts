export enum WalletType {
  WEBAUTHN = 'webauthn',
  BUILTIN = 'builtin', 
  EXTERNAL = 'external'
}

export interface WalletInfo {
  type: WalletType;
  name: string;
  description: string;
  features: string[];
  setupInstructions: string;
  pros: string[];
  cons: string[];
  icon: string;
  isAvailable: boolean;
}

export const WALLET_CONFIGS: Record<WalletType, WalletInfo> = {
  [WalletType.WEBAUTHN]: {
    type: WalletType.WEBAUTHN,
    name: 'WebAuthn Secure Wallet',
    description: 'Ultra-secure wallet using biometric authentication and hardware security keys',
    features: [
      'Biometric authentication (fingerprint, face ID)',
      'Hardware security key support',
      'No seed phrases to remember',
      'Phishing-resistant authentication',
      'Built-in security'
    ],
    setupInstructions: 'Simply authenticate using your device\'s biometric sensors or security key. No additional setup required.',
    pros: [
      'Maximum security',
      'No seed phrases to lose',
      'Phishing resistant',
      'Easy to use'
    ],
    cons: [
      'Tied to your device',
      'Cannot export private keys easily',
      'Limited backup options'
    ],
    icon: '🔐',
    isAvailable: typeof window !== 'undefined' && 'credentials' in navigator
  },
  [WalletType.BUILTIN]: {
    type: WalletType.BUILTIN,
    name: 'Built-in Wallet',
    description: 'Traditional wallet with seed phrase backup, managed by InfraSim',
    features: [
      'Standard seed phrase (12/24 words)',
      'Private key export',
      'Multiple address generation',
      'Cross-device compatibility',
      'Full backup and restore'
    ],
    setupInstructions: 'Generate a new wallet or import existing seed phrase. Always backup your seed phrase securely.',
    pros: [
      'Full control of private keys',
      'Easy backup with seed phrase',
      'Cross-device compatibility',
      'Standard wallet format'
    ],
    cons: [
      'Need to secure seed phrase',
      'Risk of losing seed phrase',
      'Password-based security'
    ],
    icon: '👛',
    isAvailable: true
  },
  [WalletType.EXTERNAL]: {
    type: WalletType.EXTERNAL,
    name: 'External Wallet',
    description: 'Connect existing wallets like MetaMask, WalletConnect, or hardware wallets',
    features: [
      'MetaMask integration',
      'WalletConnect support',
      'Hardware wallet support',
      'Existing wallet reuse',
      'Multi-chain support'
    ],
    setupInstructions: 'Connect your existing wallet through MetaMask browser extension or WalletConnect QR code.',
    pros: [
      'Use existing wallet',
      'Support for multiple wallets',
      'Hardware wallet compatibility',
      'No new setup required'
    ],
    cons: [
      'Requires external app/extension',
      'Dependent on third-party',
      'May have connection issues'
    ],
    icon: '🔗',
    isAvailable: true
  }
};
