import { ethers } from 'ethers';
import { IWalletProvider, WalletAdapter, WalletType } from '../types/wallet';
import { WebAuthnWalletAdapter } from '../adapters/webauthn-wallet-adapter';
import { SelfHostedWalletAdapter } from '../adapters/self-hosted-wallet-adapter';

export class WalletAdapterFactory {
  private static provider: ethers.JsonRpcProvider | null = null;

  public static initializeProvider(rpcUrl: string = 'http://localhost:8545'): void {
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
  }

  public static getProvider(): ethers.JsonRpcProvider {
    if (!this.provider) {
      this.initializeProvider();
    }
    return this.provider!;
  }

  public static createWebAuthnAdapter(wallet: any): WalletAdapter {
    const provider = this.getProvider();
    return {
      type: 'webauthn',
      provider: new WebAuthnWalletAdapter(wallet, provider)
    };
  }

  public static createSelfHostedAdapter(wallet: any): WalletAdapter {
    const provider = this.getProvider();
    return {
      type: 'self-hosted',
      provider: new SelfHostedWalletAdapter(wallet, provider)
    };
  }

  public static createExternalAdapter(externalProvider: IWalletProvider): WalletAdapter {
    return {
      type: 'external',
      provider: externalProvider
    };
  }

  public static createAdapter(walletType: WalletType, wallet: any): WalletAdapter {
    switch (walletType) {
      case 'webauthn':
        return this.createWebAuthnAdapter(wallet);
      case 'self-hosted':
        return this.createSelfHostedAdapter(wallet);
      default:
        throw new Error(`Unsupported wallet type: ${walletType}`);
    }
  }
}