import { LangChainOrchestrator } from '../core/langchain-orchestrator';
import { ModelRole } from '../core/model-manager';
import { ProcessingMode } from '../core/langchain-orchestrator';

/**
 * Example demonstrating the dual model configuration system
 * This shows how to configure separate models for chat and structured tasks
 */
async function demonstrateDualModelSystem() {
  console.log('🚀 Dual Model System Demo');
  
  // Initialize the orchestrator
  const orchestrator = new LangChainOrchestrator('http://localhost:11434');
  
  // Configure dual models
  await orchestrator.configureModels({
    // Chat model - optimized for conversational interactions
    chatModel: {
      id: 'llama3.2:latest',
      name: 'Llama 3.2 Chat',
      type: 'ollama',
      processingMode: ProcessingMode.LLAMA_CHAT,
      temperature: 0.3,
      description: 'Optimized for natural conversation and help'
    },
    // Tools model - optimized for structured output and function calling
    toolsModel: {
      id: 'smangrul/llama-3-8b-instruct-function-calling',
      name: 'Llama 3 8B Function Calling',
      type: 'ollama',
      processingMode: ProcessingMode.LLAMA_CHAT,
      temperature: 0.1,
      description: 'Optimized for structured tasks and parsing'
    },
    ollamaHost: 'http://localhost:11434'
  });

  console.log('✅ Models configured successfully');
  
  // Display current model information
  const modelsInfo = orchestrator.getModelsInfo();
  console.log('📋 Current Model Configuration:');
  console.log(`Chat Model: ${modelsInfo.chat?.name} (${modelsInfo.chat?.id})`);
  console.log(`Tools Model: ${modelsInfo.tools?.name} (${modelsInfo.tools?.id})`);
  
  // Example 1: Chat interaction using the chat model
  console.log('\n💬 Example 1: Chat Interaction');
  try {
    const chatResponse = await orchestrator.generateChatResponse(
      "What are the key considerations when designing a secure banking infrastructure?"
    );
    console.log('Chat Response:', chatResponse.substring(0, 200) + '...');
  } catch (error) {
    console.error('Chat failed:', error);
  }
  
  // Example 2: Structured parsing using the tools model
  console.log('\n🔧 Example 2: Infrastructure Parsing');
  try {
    const parsedInfra = await orchestrator.parseInfrastructureDescription(
      "Create a secure banking system with a web portal, database, firewall, and load balancer"
    );
    console.log('Parsed Infrastructure:', {
      entitiesCount: parsedInfra.entities.length,
      connectionsCount: parsedInfra.connections.length,
      entities: parsedInfra.entities.map(e => ({ name: e.name, type: e.type }))
    });
  } catch (error) {
    console.error('Parsing failed:', error);
  }
  
  // Example 3: Organization creation using the tools model
  console.log('\n🏢 Example 3: Organization Creation');
  try {
    const organization = await orchestrator.createRootOrganizationWithMemory(
      "A fintech startup specializing in digital payments and cryptocurrency trading"
    );
    console.log('Created Organization:', {
      name: organization.name,
      hostname: organization.hostname,
      metadata: organization.metadata
    });
  } catch (error) {
    console.error('Organization creation failed:', error);
  }
  
  // Example 4: Model switching at runtime
  console.log('\n🔄 Example 4: Runtime Model Switching');
  try {
    await orchestrator.switchModel(ModelRole.CHAT, {
      id: 'mistral:latest',
      name: 'Mistral Latest',
      type: 'ollama',
      processingMode: ProcessingMode.STRUCTURED_OUTPUT,
      temperature: 0.2,
      description: 'Alternative chat model'
    });
    
    const updatedModelsInfo = orchestrator.getModelsInfo();
    console.log('✅ Chat model switched to:', updatedModelsInfo.chat?.name);
  } catch (error) {
    console.error('Model switching failed:', error);
  }
  
  console.log('\n🎉 Dual Model System Demo Complete');
}

/**
 * Example showing different model combinations for different use cases
 */
async function showModelCombinations() {
  console.log('\n📚 Model Combination Examples:');
  
  const combinations = [
    {
      name: 'Local Development Setup',
      chat: 'llama3.2:latest',
      tools: 'smangrul/llama-3-8b-instruct-function-calling',
      description: 'Both models local, optimized for development'
    },
    {
      name: 'Hybrid Setup',
      chat: 'gpt-3.5-turbo',
      tools: 'smangrul/llama-3-8b-instruct-function-calling',
      description: 'OpenAI for chat, local Llama for structured tasks'
    },
    {
      name: 'Cloud Setup',
      chat: 'gpt-4',
      tools: 'gpt-3.5-turbo',
      description: 'Full OpenAI setup with different models for different tasks'
    },
    {
      name: 'Performance Optimized',
      chat: 'llama3.2:latest',
      tools: 'codellama:latest',
      description: 'General chat + specialized code model'
    }
  ];
  
  combinations.forEach((combo, index) => {
    console.log(`${index + 1}. ${combo.name}`);
    console.log(`   Chat: ${combo.chat}`);
    console.log(`   Tools: ${combo.tools}`);
    console.log(`   Use Case: ${combo.description}\n`);
  });
}

// Export the demo functions
export { demonstrateDualModelSystem, showModelCombinations };

// If running this file directly, execute the demo
if (require.main === module) {
  demonstrateDualModelSystem()
    .then(() => showModelCombinations())
    .catch(console.error);
}