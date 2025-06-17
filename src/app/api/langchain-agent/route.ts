import { NextRequest, NextResponse } from 'next/server';
import { LangChainInfrastructureAgent } from '../../../core/langchain-agent';

const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

export async function POST(request: NextRequest) {
  try {
    const { prompt, settings } = await request.json();
    
    // Create agent with provided or default settings
    const agent = new LangChainInfrastructureAgent({
      provider: settings?.provider || 'ollama',
      modelName: settings?.chatModel || 'llama3.2:latest',
      ollamaBaseUrl: ollamaBaseUrl,
      apiKey: settings?.apiKey,
      temperature: settings?.temperature || 0.1
    });

    // Initialize the agent
    await agent.initialize();

    const result = await agent.executeCommand(prompt);

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
    const agent = new LangChainInfrastructureAgent({
      provider: 'ollama',
      modelName: 'llama3.2:latest',
      ollamaBaseUrl: ollamaBaseUrl
    });

    // Initialize the agent to get tools
    await agent.initialize();
    const tools = agent.getAvailableTools();
    
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