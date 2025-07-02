// Simple in-memory mapping of Matrix user IDs to wallet addresses
// In production, this would be stored in a database
const userWalletMapping = new Map<string, string>();

// Helper function to get wallet address from Matrix user ID
export function getWalletAddressForMatrixUser(matrixUserId: string): string | null {
  // First check our mapping
  const mappedAddress = userWalletMapping.get(matrixUserId);
  if (mappedAddress) {
    return mappedAddress;
  }

  // For demo purposes, generate a fake wallet address based on user ID
  // This simulates having wallet addresses for other users
  if (matrixUserId.includes('@alice:')) {
    return '0x742d35Cc6634C0532925a3b8D6Ac0FEbEF5E4529';
  } else if (matrixUserId.includes('@bob:')) {
    return '0x8ba1f109551bD432803012645Hac136c22Ad69E0';
  } else if (matrixUserId.includes('@charlie:')) {
    return '0x1234567890123456789012345678901234567890';
  } else if (matrixUserId.includes('@wallet_')) {
    // For wallet-based users, extract the address from the username
    const match = matrixUserId.match(/@wallet_([a-f0-9]+):/);
    if (match) {
      return '0x' + match[1].padEnd(40, '0');
    }
  }

  return null;
}

// Helper function to store wallet address for Matrix user
export function storeWalletAddressForMatrixUser(matrixUserId: string, walletAddress: string): void {
  userWalletMapping.set(matrixUserId, walletAddress);
}

// Helper function to get all wallet mappings (for debugging)
export function getAllWalletMappings(): Map<string, string> {
  return new Map(userWalletMapping);
}