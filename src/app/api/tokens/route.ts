import { NextRequest, NextResponse } from 'next/server';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
const provider = new ethers.JsonRpcProvider(rpcUrl);

// ERC20 ABI for token info
const ERC20_ABI = [
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address) view returns (uint256)'
];

interface TokenInfo {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  type: 'ERC20' | 'Native';
  deployedAt?: string;
}

export async function GET(request: NextRequest) {
  try {
    const tokens: TokenInfo[] = [];

    // Add native ETH
    tokens.push({
      address: '0x0000000000000000000000000000000000000000',
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      totalSupply: 'N/A',
      type: 'Native'
    });

    // Load deployed contracts
    const deployedPath = path.join(process.cwd(), 'ethereum', 'data', 'deployed.json');
    
    if (fs.existsSync(deployedPath)) {
      const deployedData = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
      
      // Process known token contracts
      for (const [contractName, contractData] of Object.entries(deployedData.contracts)) {
        const contract = contractData as any;
        
        // Check if it's a token contract (has symbol and decimals)
        if (contract.symbol && contract.decimals !== undefined) {
          try {
            const tokenContract = new ethers.Contract(contract.address, ERC20_ABI, provider);
            
            // Get additional token info from contract
            const [name, totalSupply] = await Promise.all([
              tokenContract.name().catch(() => contractName),
              tokenContract.totalSupply().catch(() => contract.totalSupply || '0')
            ]);

            tokens.push({
              address: contract.address,
              name: name,
              symbol: contract.symbol,
              decimals: parseInt(contract.decimals.toString()),
              totalSupply: totalSupply.toString(),
              type: 'ERC20',
              deployedAt: deployedData.deployedAt
            });
          } catch (error) {
            console.warn(`Failed to fetch token info for ${contractName}:`, error);
            
            // Add basic info even if contract call fails
            tokens.push({
              address: contract.address,
              name: contractName,
              symbol: contract.symbol,
              decimals: parseInt(contract.decimals.toString()),
              totalSupply: contract.totalSupply || '0',
              type: 'ERC20',
              deployedAt: deployedData.deployedAt
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      tokens,
      totalTokens: tokens.length
    });

  } catch (error) {
    console.error('Error fetching tokens:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch tokens',
        tokens: []
      },
      { status: 500 }
    );
  }
}