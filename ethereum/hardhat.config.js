require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://localhost:8545",
      chainId: 31337,
      // For localhost development, use default Hardhat accounts
      // Private key is only used for production/testnet deployments
      accounts: process.env.NODE_ENV === 'production' && process.env.PRIVATE_KEY ? 
        [process.env.PRIVATE_KEY] : 
        undefined // Use default Hardhat accounts for local development
    },
    hardhat: {
      chainId: 31337
    }
  },
  paths: {
    artifacts: "/data/artifacts",
    cache: "/data/cache"
  }
};