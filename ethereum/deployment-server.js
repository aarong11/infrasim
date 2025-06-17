const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8546;

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Get deployment data endpoint
app.get('/deployment', (req, res) => {
  try {
    const deploymentPath = '/data/deployed.json';
    
    if (!fs.existsSync(deploymentPath)) {
      return res.status(404).json({
        success: false,
        error: 'Deployment data not found'
      });
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    
    // Transform the data into a more frontend-friendly format
    const contractsArray = Object.entries(deploymentData.contracts).map(([name, contract]) => ({
      name,
      address: contract.address,
      ...contract
    }));
    
    res.json({
      success: true,
      network: {
        name: deploymentData.network,
        chainId: deploymentData.chainId,
        rpcUrl: 'http://localhost:8545'
      },
      deployment: {
        deployedAt: deploymentData.deployedAt,
        deployer: deploymentData.deployer
      },
      contracts: contractsArray,
      contractsMap: deploymentData.contracts,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error reading deployment data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read deployment data'
    });
  }
});

// Get specific contract endpoint
app.get('/contracts/:name', (req, res) => {
  try {
    const deploymentPath = '/data/deployed.json';
    const contractName = req.params.name;
    
    if (!fs.existsSync(deploymentPath)) {
      return res.status(404).json({
        success: false,
        error: 'Deployment data not found'
      });
    }
    
    const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, 'utf8'));
    const contract = deploymentData.contracts[contractName];
    
    if (!contract) {
      return res.status(404).json({
        success: false,
        error: `Contract '${contractName}' not found`
      });
    }
    
    res.json({
      success: true,
      contract: {
        name: contractName,
        address: contract.address,
        ...contract
      }
    });
    
  } catch (error) {
    console.error('Error reading contract data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to read contract data'
    });
  }
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`📊 Deployment server running on port ${PORT}`);
  console.log(`🔗 Deployment endpoint: http://localhost:${PORT}/deployment`);
});

module.exports = app;