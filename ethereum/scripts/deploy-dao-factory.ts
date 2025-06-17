import { ethers } from "hardhat";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

dotenv.config();

async function main() {
  const deployedPath = "/data/deployed.json";
  
  // Read existing deployment data
  let deploymentData: any = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    contracts: {}
  };

  if (fs.existsSync(deployedPath)) {
    try {
      deploymentData = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
      console.log("📄 Found existing deployment data");
    } catch (error) {
      console.warn("⚠️  Could not read existing deployment data, creating new");
    }
  }

  // Check if DAOFactory is already deployed
  if (deploymentData.contracts?.DAOFactory) {
    console.log("✅ DAOFactory already deployed at:", deploymentData.contracts.DAOFactory.address);
    console.log("Skipping DAO factory deployment.");
    return;
  }

  const [deployer] = await ethers.getSigners();

  console.log(`🚀 Deploying DAOFactory with address: ${deployer.address}`);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const DAOFactory = await ethers.getContractFactory("DAOFactory");
  const daoFactory = await DAOFactory.deploy();

  await daoFactory.waitForDeployment();
  const daoFactoryAddress = await daoFactory.getAddress();

  console.log(`✅ DAOFactory deployed to: ${daoFactoryAddress}`);

  // Update deployment data
  deploymentData.contracts.DAOFactory = {
    address: daoFactoryAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    description: "Factory contract for creating DAOs"
  };

  // Ensure /data directory exists
  const dataDir = path.dirname(deployedPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Save updated deployment data
  fs.writeFileSync(deployedPath, JSON.stringify(deploymentData, null, 2));
  console.log("📝 Deployment data updated at:", deployedPath);
  
  console.log("🎉 DAO Factory deployment completed successfully!");
}

main().catch((error) => {
  console.error("❌ DAO Factory deployment failed:", error);
  process.exitCode = 1;
});