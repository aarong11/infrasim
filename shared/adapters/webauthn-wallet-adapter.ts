import { ethers } from 'ethers';
import { IWalletProvider } from '../types/wallet';

export class WebAuthnWalletAdapter implements IWalletProvider {
  private wallet: any;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Wallet;

  constructor(wallet: any, provider: ethers.JsonRpcProvider) {
    this.wallet = wallet;
    this.provider = provider;
    this.signer = new ethers.Wallet(wallet.privateKey, provider);
  }

  getAddress(): string {
    return this.wallet.address;
  }

  async signMessage(message: string): Promise<string> {
    return await this.signer.signMessage(message);
  }

  async signTransaction(transaction: any): Promise<string> {
    return await this.signer.signTransaction(transaction);
  }

  async sendTransaction(transaction: any): Promise<string> {
    const tx = await this.signer.sendTransaction(transaction);
    return tx.hash;
  }

  getProvider(): ethers.JsonRpcProvider {
    return this.provider;
  }

  getSigner(): ethers.Wallet {
    return this.signer;
  }
}