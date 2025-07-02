import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    // Check if setup configuration exists
    const configPath = path.join(process.cwd(), 'data', 'setup-config.json');
    
    console.log('🔍 Checking setup status at:', configPath);
    
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ Setup config found:', { setupCompleted: config.setupCompleted });
      return NextResponse.json({
        success: true,
        setupCompleted: config.setupCompleted || false,
        config
      });
    }
    
    console.log('❌ No setup config found');
    // No config exists - setup not completed
    return NextResponse.json({
      success: true,
      setupCompleted: false
    });
  } catch (error) {
    console.error('Error checking setup status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check setup status'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { networkConfig, adminWallet } = body;
    
    // Validate required data
    if (!networkConfig || !adminWallet) {
      return NextResponse.json({
        success: false,
        error: 'Missing network configuration or admin wallet data'
      }, { status: 400 });
    }
    
    // Ensure data directory exists with proper permissions
    const dataDir = path.join(process.cwd(), 'data');
    console.log('📁 Creating data directory at:', dataDir);
    
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true, mode: 0o755 });
      console.log('✅ Data directory created');
    }
    
    // Save setup configuration
    const setupConfig = {
      setupCompleted: true,
      completedAt: new Date().toISOString(),
      networkConfig,
      adminWallet: {
        address: adminWallet.address,
        isHardwareWallet: adminWallet.isHardwareWallet
        // Note: We don't save private keys or mnemonics for security
      }
    };
    
    const configPath = path.join(dataDir, 'setup-config.json');
    console.log('💾 Saving setup config to:', configPath);
    
    // Write file with proper permissions
    fs.writeFileSync(configPath, JSON.stringify(setupConfig, null, 2), { mode: 0o644 });
    
    // Verify the file was written correctly
    if (fs.existsSync(configPath)) {
      const verifyConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      console.log('✅ Setup config verified:', { setupCompleted: verifyConfig.setupCompleted });
    } else {
      console.error('❌ Setup config file was not created properly');
    }
    
    // Try to configure the Hardhat deployment server if available
    try {
      const response = await fetch('http://localhost:8546/configure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ networkConfig, adminWallet })
      });
      
      if (!response.ok) {
        console.warn('Could not configure Hardhat deployment server:', response.statusText);
      }
    } catch (deploymentError) {
      console.warn('Hardhat deployment server not available:', deploymentError);
      // Continue anyway - this is not a critical failure
    }
    
    console.log('🎉 Setup completed successfully');
    return NextResponse.json({
      success: true,
      message: 'Setup completed successfully'
    });
    
  } catch (error) {
    console.error('Error completing setup:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to complete setup'
    }, { status: 500 });
  }
}