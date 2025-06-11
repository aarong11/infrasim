import { NextRequest, NextResponse } from 'next/server';
import { LangChainInfrastructureAgent } from '../../../core/langchain-agent';

// Singleton agent instance
let agent: LangChainInfrastructureAgent | null = null;

async function getAgent(): Promise<LangChainInfrastructureAgent> {
  if (!agent) {
    agent = new LangChainInfrastructureAgent({
      provider: 'ollama',
      modelName: 'smangrul/llama-3-8b-instruct-function-calling',
      ollamaBaseUrl: 'http://localhost:11434',
      temperature: 0.1,
    });
    
    await agent.initialize();
  }
  return agent;
}

export async function POST(request: NextRequest) {
  try {
    const { input, provider, modelName, apiKey } = await request.json();
    
    if (!input) {
      return NextResponse.json(
        { success: false, error: 'Input is required' },
        { status: 400 }
      );
    }

    // Create or get agent with specified configuration
    let agentInstance = agent;
    
    // If different provider/model specified, create new instance
    if (provider || modelName) {
      agentInstance = new LangChainInfrastructureAgent({
        provider: provider || 'ollama',
        modelName: modelName || 'smangrul/llama-3-8b-instruct-function-calling',
        ollamaBaseUrl: 'http://localhost:11434',
        apiKey,
        temperature: 0.1,
      });
      
      await agentInstance.initialize();
    } else {
      agentInstance = await getAgent();
    }

    const result = await agentInstance.executeCommand(input);

    return NextResponse.json({
      success: true,
      ...result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('LangChain agent API error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const agentInstance = await getAgent();
    const tools = agentInstance.getAvailableTools();
    
    return NextResponse.json({
      success: true,
      tools,
      message: `Available tools: ${tools.length}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to get tools:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}