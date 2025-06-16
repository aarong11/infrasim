# Plugin System Documentation

## Overview

The InfraSim Plugin System is a comprehensive framework that enables JSON-defined plugins with multi-environment execution capabilities. It supports server-side, browser-based, and containerized plugin execution with full LLM integration.

## Architecture

### Core Components

1. **Plugin System (`plugin-system.ts`)** - Core types and interfaces
2. **Plugin Registry (`plugin-registry.ts`)** - Plugin storage and management
3. **Plugin Executors (`plugin-executors.ts`)** - Environment-specific execution
4. **Plugin Manager (`plugin-manager.ts`)** - Main orchestration layer

### Execution Environments

- **Server Environment**: Node.js sandboxed execution with controlled modules
- **Browser Environment**: DOM manipulation and Web Worker isolation
- **Container Environment**: Isolated execution for external API calls

## Plugin Definition Format

```json
{
  "pluginName": "myPlugin",
  "version": "1.0.0",
  "description": "Plugin description",
  "executionContext": "server|browser|container",
  "parameters": {
    "paramName": {
      "type": "string|number|boolean|object|array",
      "required": true,
      "description": "Parameter description",
      "default": "optional default value"
    }
  },
  "inlineCode": "function myPlugin(param1, param2) { return { success: true }; }",
  "dependencies": ["nodemailer", "uuid"],
  "timeout": 30000,
  "retries": 0,
  "metadata": {}
}
```

## Default Plugins

### sendEmail (Server)
- Sends email notifications via SMTP
- Parameters: recipient, subject, body, smtp (optional)
- Dependencies: nodemailer

### updateUI (Browser)
- Updates DOM elements with animations
- Parameters: selector, content, animation (optional)
- Direct DOM manipulation in main thread

### callExternalAPI (Container)
- Makes secure HTTP requests to external APIs
- Parameters: url, method, headers, body, timeout
- Dependencies: node-fetch, abort-controller

## Usage Examples

### Direct Plugin Execution
```typescript
import { getPluginManager } from './core/plugin-manager';

const pluginManager = getPluginManager();

// Execute existing plugin
const result = await pluginManager.executePlugin({
  pluginName: 'sendEmail',
  parameters: {
    recipient: 'user@example.com',
    subject: 'Test Email',
    body: 'Hello from InfraSim!'
  }
});
```

### LLM-Driven Plugin Creation
```typescript
// Register a new plugin
await pluginManager.createPluginFromLLM({
  name: 'dataProcessor',
  description: 'Process CSV data and generate reports',
  code: `
    function dataProcessor(csvData, reportType) {
      // Process the data
      const rows = csvData.split('\\n');
      const processed = rows.map(row => row.split(','));
      
      return {
        success: true,
        result: {
          totalRows: processed.length,
          reportType: reportType,
          processedAt: new Date().toISOString()
        }
      };
    }
  `,
  environment: ExecutionEnvironment.SERVER,
  parameters: {
    csvData: { type: 'string', required: true },
    reportType: { type: 'string', required: false, default: 'summary' }
  }
});
```

### Tool Integration
The plugin system integrates with the existing tool architecture through new tool actions:

- `executePlugin` - Execute a plugin by name
- `createPlugin` - Create a new plugin
- `listPlugins` - List available plugins

Example tool call:
```json
{
  "action": "executePlugin",
  "parameters": {
    "pluginName": "updateUI",
    "parameters": {
      "selector": "#status",
      "content": "Processing complete!",
      "animation": "fade"
    },
    "task": "show success message"
  }
}
```

## Security Features

### Server Environment Security
- Sandboxed VM execution with limited globals
- Whitelisted module access only
- Filtered environment variables
- Resource limits (memory, CPU, execution time)

### Browser Environment Security
- Web Worker isolation for non-DOM plugins
- Controlled DOM access for UI plugins
- Content Security Policy compliance

### Container Environment Security
- Network isolation simulation
- Dependency management
- Timeout enforcement

## UI Components

### Plugin Manager Panel
- Plugin browser with execution environment indicators
- Real-time execution monitoring
- Plugin creation interface
- Execution history tracking

### Plugin Execution Status
- Floating status indicator for active executions
- Real-time log streaming
- Cancellation controls
- Environment-specific icons

## Performance Monitoring

The system tracks:
- Execution duration and success rates
- Plugin usage statistics
- Environment-specific performance
- Resource utilization

## Error Handling

- Comprehensive error logging
- Graceful fallbacks for failed executions
- Timeout management
- Retry mechanisms with exponential backoff

## Integration Points

### LLM Integration
- Natural language plugin creation
- Automatic environment detection
- Parameter extraction from code
- Dependency analysis

### Tool System Integration
- Seamless tool action registration
- Context-aware execution
- Result integration with existing workflows

### UI Integration
- Plugin manager in top menu bar
- Execution status indicators
- Real-time monitoring panels

## Future Enhancements

1. **Remote Plugin Registry** - Share plugins across instances
2. **Plugin Marketplace** - Community-driven plugin ecosystem
3. **Advanced Sandboxing** - Docker-based container execution
4. **Plugin Composition** - Chain multiple plugins together
5. **Version Management** - Plugin versioning and updates
6. **Performance Analytics** - Advanced metrics and optimization
7. **Plugin Testing Framework** - Automated testing capabilities

## Best Practices

1. **Security First** - Always validate inputs and limit permissions
2. **Resource Management** - Set appropriate timeouts and limits
3. **Error Handling** - Implement comprehensive error handling
4. **Documentation** - Document plugin parameters and behavior
5. **Testing** - Test plugins in all target environments
6. **Dependencies** - Minimize external dependencies
7. **Versioning** - Use semantic versioning for plugin updates