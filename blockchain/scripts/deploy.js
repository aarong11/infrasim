const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Starting Polygon testnet contract deployment...");
  
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "ETH");
  
  // Deploy DAOFactory
  console.log("📄 Deploying DAOFactory...");
  const DAOFactory = await ethers.getContractFactory("DAOFactory");
  const daoFactory = await DAOFactory.deploy();
  await daoFactory.waitForDeployment();
  
  const deploymentData = {
    network: process.env.NETWORK_NAME || "Polygon Mumbai Testnet",
    chainId: parseInt(process.env.CHAIN_ID) || 80001,
    deployedAt: new Date().toISOString(),
    contracts: {
      DAOFactory: {
        address: await daoFactory.getAddress(),
        deployer: deployer.address,
        deployedAt: new Date().toISOString(),
        description: "Factory contract for creating DAOs",
        blockNumber: await ethers.provider.getBlockNumber()
      }
    }
  };
  
  // Save deployment data
  const deploymentPath = path.join("/app/data", "deployed.json");
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  
  console.log("✅ DAOFactory deployed to:", await daoFactory.getAddress());
  console.log("📄 Deployment data saved to:", deploymentPath);
  
  return deploymentData;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });