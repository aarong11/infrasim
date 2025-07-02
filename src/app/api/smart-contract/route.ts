import { NextRequest, NextResponse } from 'next/server';
import { withAuth, MiddlewarePresets, AuthenticatedRequest, getWalletAddress, AuthAPIResponse } from '../../../lib/middleware/auth-utils';
import { ethers } from 'ethers';

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

/**
 * Get deployed contract address from deployment data
 */
async function getDeployedContractAddress(): Promise<string | null> {
  try {
    const response = await fetch('http://localhost:8546/deployed');
    const deploymentData = await response.json();
    return deploymentData.contracts?.APIAccessRegistry?.address || null;
  } catch (error) {
    console.warn('Could not fetch contract address:', error);
    return null;
  }
}

/**
 * GET /api/smart-contract/info
 * Get smart contract information and user registration status
 */
export const GET = withAuth(MiddlewarePresets.basicAuth(), async (request: AuthenticatedRequest) => {
  try {
    const walletAddress = getWalletAddress(request);
    const contractAddress = await getDeployedContractAddress();
    
    if (!contractAddress) {
      return AuthAPIResponse.error('Smart contract not deployed', 'CONTRACT_NOT_FOUND', 404);
    }

    // Get provider and contract
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    const contractABI = [
      'function isRegistered(address user) view returns (bool)',
      'function getUserInfo(address user) view returns (tuple(bool registered, uint256 depositAmount, uint256 totalSpent, uint256 lastActivity, bool isActive))',
      'function minimumDeposit() view returns (uint256)',
      'function registrationFee() view returns (uint256)',
      'function getServiceTier(string memory serviceName) view returns (tuple(string name, uint256 costPerRequest, uint256 rateLimit, bool requiresRegistration, bool isActive))'
    ];

    const contract = new ethers.Contract(contractAddress, contractABI, provider);

    // Get contract configuration
    const [minimumDeposit, registrationFee, isRegistered, userInfo] = await Promise.all([
      contract.minimumDeposit(),
      contract.registrationFee(),
      contract.isRegistered(walletAddress),
      contract.getUserInfo(walletAddress).catch(() => null)
    ]);

    // Get service tiers
    const serviceTiers = {};
    const tierNames = ['basic', 'premium', 'ai-heavy'];
    
    for (const tierName of tierNames) {
      try {
        const tier = await contract.getServiceTier(tierName);
        serviceTiers[tierName] = {
          name: tier.name,
          costPerRequest: ethers.formatEther(tier.costPerRequest),
          rateLimit: tier.rateLimit.toString(),
          requiresRegistration: tier.requiresRegistration,
          isActive: tier.isActive
        };
      } catch (error) {
        console.warn(`Could not fetch tier ${tierName}:`, error);
      }
    }

    return AuthAPIResponse.success({
      contractAddress,
      walletAddress,
      configuration: {
        minimumDeposit: ethers.formatEther(minimumDeposit),
        registrationFee: ethers.formatEther(registrationFee),
        totalRequired: ethers.formatEther(minimumDeposit + registrationFee)
      },
      userStatus: {
        isRegistered,
        userInfo: userInfo ? {
          registered: userInfo.registered,
          depositAmount: ethers.formatEther(userInfo.depositAmount),
          totalSpent: ethers.formatEther(userInfo.totalSpent),
          lastActivity: new Date(Number(userInfo.lastActivity) * 1000).toISOString(),
          isActive: userInfo.isActive
        } : null
      },
      serviceTiers,
      registrationInstructions: {
        step1: "Call registerUser() function with minimum deposit + registration fee",
        step2: `Send ${ethers.formatEther(minimumDeposit + registrationFee)} ETH to the contract`,
        step3: "You can add more deposits later using addDeposit() function"
      }
    });

  } catch (error) {
    console.error('Error getting contract info:', error);
    return AuthAPIResponse.error('Failed to get contract information', 'CONTRACT_ERROR', 500);
  }
});

/**
 * POST /api/smart-contract/register
 * Register wallet in the smart contract (requires transaction to be sent by frontend)
 */
export const POST = withAuth(MiddlewarePresets.basicAuth(), async (request: AuthenticatedRequest) => {
  try {
    const { transactionHash } = await request.json();
    const walletAddress = getWalletAddress(request);
    
    if (!transactionHash) {
      return AuthAPIResponse.error('Transaction hash is required', 'MISSING_TX_HASH', 400);
    }

    // Get provider
    const rpcUrl = process.env.ETHEREUM_RPC_URL || 'http://localhost:8545';
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    // Wait for transaction confirmation
    const receipt = await provider.getTransactionReceipt(transactionHash);
    
    if (!receipt) {
      return AuthAPIResponse.error('Transaction not found or not confirmed', 'TX_NOT_FOUND', 400);
    }

    if (receipt.status !== 1) {
      return AuthAPIResponse.error('Transaction failed', 'TX_FAILED', 400);
    }

    // Verify the transaction was to the correct contract
    const contractAddress = await getDeployedContractAddress();
    if (receipt.to?.toLowerCase() !== contractAddress?.toLowerCase()) {
      return AuthAPIResponse.error('Transaction was not sent to the correct contract', 'INVALID_CONTRACT', 400);
    }

    // Check if user is now registered
    const contractABI = ['function isRegistered(address user) view returns (bool)'];
    const contract = new ethers.Contract(contractAddress!, contractABI, provider);
    const isRegistered = await contract.isRegistered(walletAddress);

    if (!isRegistered) {
      return AuthAPIResponse.error('Registration transaction did not succeed', 'REGISTRATION_FAILED', 400);
    }

    return AuthAPIResponse.success({
      message: 'Successfully registered in smart contract',
      walletAddress,
      transactionHash,
      contractAddress,
      blockNumber: receipt.blockNumber,
      gasUsed: receipt.gasUsed.toString()
    });

  } catch (error) {
    console.error('Error verifying registration:', error);
    return AuthAPIResponse.error('Failed to verify registration', 'VERIFICATION_ERROR', 500);
  }
});