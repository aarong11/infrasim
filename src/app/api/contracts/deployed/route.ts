import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  try {
    const deployedPath = path.join(process.cwd(), 'ethereum/data/deployed.json');
    
    if (!fs.existsSync(deployedPath)) {
      return NextResponse.json({
        success: false,
        error: 'Deployment data not found. Please ensure contracts are deployed.'
      }, { status: 404 });
    }

    const deploymentData = JSON.parse(fs.readFileSync(deployedPath, 'utf8'));
    
    return NextResponse.json({
      success: true,
      ...deploymentData
    });
    
  } catch (error) {
    console.error('Error reading deployment data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to read deployment data'
    }, { status: 500 });
  }
}