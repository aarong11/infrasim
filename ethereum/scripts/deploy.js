const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deployedPath = "/data/deployed.json";
  
  // Check if contracts are already deployed
  if (fs.existsSync(deployedPath)) {
    console.log("Contracts already deployed. Skipping deployment.");
    const deployed = JSON.parse(fs.readFileSync(deployedPath, "utf8"));
    console.log("Existing deployments:", deployed);
    return;
  }

  console.log("🚀 Starting deployment...");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy USDC
  console.log("📄 Deploying USDC contract...");
  const USDC = await hre.ethers.getContractFactory("USDC");
  const usdc = await USDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("✅ USDC deployed to:", usdcAddress);

  // Deploy BridgeVault
  console.log("📄 Deploying BridgeVault contract...");
  const BridgeVault = await hre.ethers.getContractFactory("BridgeVault");
  const bridgeVault = await BridgeVault.deploy();
  await bridgeVault.waitForDeployment();
  const bridgeVaultAddress = await bridgeVault.getAddress();
  console.log("✅ BridgeVault deployed to:", bridgeVaultAddress);

  // Approve and deposit 100 USDC into the vault
  console.log("💰 Depositing 100 USDC into BridgeVault...");
  const depositAmount = hre.ethers.parseUnits("100", 6); // 100 USDC (6 decimals)
  
  // Approve the vault to spend USDC
  const approveTx = await usdc.approve(bridgeVaultAddress, depositAmount);
  await approveTx.wait();
  console.log("✅ Approved BridgeVault to spend 100 USDC");

  // Deposit into vault
  const depositTx = await bridgeVault.deposit(usdcAddress, depositAmount);
  await depositTx.wait();
  console.log("✅ Deposited 100 USDC into BridgeVault");

  // Verify the deposit
  const vaultBalance = await bridgeVault.getBalance(usdcAddress);
  console.log("🔍 Vault USDC balance:", hre.ethers.formatUnits(vaultBalance, 6), "USDC");

  // Save deployment addresses
  const deploymentData = {
    network: "localhost",
    chainId: 31337,
    deployedAt: new Date().toISOString(),
    deployer: deployer.address,
    contracts: {
      USDC: {
        address: usdcAddress,
        symbol: "USDC",
        decimals: 6,
        totalSupply: "1000000"
      },
      BridgeVault: {
        address: bridgeVaultAddress,
        usdcBalance: hre.ethers.formatUnits(vaultBalance, 6)
      }
    }
  };

  // Ensure /data directory exists
  const dataDir = path.dirname(deployedPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(deployedPath, JSON.stringify(deploymentData, null, 2));
  console.log("📝 Deployment data saved to:", deployedPath);
  
  console.log("🎉 Deployment completed successfully!");
  console.log("Contract addresses:");
  console.log(`  USDC: ${usdcAddress}`);
  console.log(`  BridgeVault: ${bridgeVaultAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });