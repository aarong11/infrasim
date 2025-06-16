// Plugin Registry - Manages plugin definitions and storage with JSON file support
import { 
  IPluginRegistry, 
  PluginDefinition, 
  PluginDefinitionSchema
} from './plugin-system';
import * as fs from 'fs';
import * as path from 'path';

export class PluginRegistry implements IPluginRegistry {
  private plugins: Map<string, PluginDefinition> = new Map();
  private storageKey = 'infrasim-plugins';
  private pluginsDirectory: string;

  constructor() {
    this.pluginsDirectory = this.resolvePluginsDirectory();
    this.loadPluginsFromStorage();
    this.loadPluginsFromFiles();
  }

  private resolvePluginsDirectory(): string {
    if (typeof window !== 'undefined') {
      return ''; // Browser environment, no filesystem access
    }
    
    // Try different possible paths for the plugins directory
    const possiblePaths = [
      path.join(process.cwd(), 'src', 'plugins'),
      path.join(__dirname, '..', 'plugins'),
      path.join(__dirname, '..', '..', 'src', 'plugins'),
      path.join(process.cwd(), 'plugins')
    ];

    for (const pluginPath of possiblePaths) {
      if (this.directoryExists(pluginPath)) {
        console.log(`📁 Found plugins directory: ${pluginPath}`);
        return pluginPath;
      }
    }

    // Default fallback
    const defaultPath = path.join(process.cwd(), 'src', 'plugins');
    console.log(`📁 Using default plugins directory: ${defaultPath}`);
    return defaultPath;
  }

  private directoryExists(dirPath: string): boolean {
    if (typeof window !== 'undefined') return false;
    
    try {
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Load plugins from JSON files in the plugins directory
   */
  private loadPluginsFromFiles(): void {
    if (typeof window !== 'undefined') return;
    
    try {
      if (!this.directoryExists(this.pluginsDirectory)) {
        console.warn(`⚠️ Plugins directory not found: ${this.pluginsDirectory}`);
        return;
      }

      const files = fs.readdirSync(this.pluginsDirectory);
      const jsonFiles = files.filter(file => file.endsWith('.json'));
      
      console.log(`🔍 Loading plugins from ${jsonFiles.length} JSON files`);

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.pluginsDirectory, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const pluginData = JSON.parse(content);

          // Validate plugin definition
          const validation = PluginDefinitionSchema.safeParse(pluginData);
          if (!validation.success) {
            console.error(`❌ Invalid plugin definition in ${file}:`, validation.error.message);
            continue;
          }

          const plugin = validation.data;
          this.plugins.set(plugin.pluginName, plugin);
          
          console.log(`✅ Loaded plugin from file: ${plugin.pluginName} v${plugin.version} (${plugin.executionContext})`);
        } catch (error) {
          console.error(`❌ Failed to load plugin from ${file}:`, error instanceof Error ? error.message : 'Unknown error');
        }
      }

      console.log(`📦 Total plugins loaded from files: ${this.plugins.size}`);
    } catch (error) {
      console.warn('Failed to load plugins from files:', error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Save plugin to JSON file
   */
  async savePluginToFile(plugin: PluginDefinition): Promise<void> {
    if (typeof window !== 'undefined') return;
    
    try {
      // Ensure plugins directory exists
      if (!this.directoryExists(this.pluginsDirectory)) {
        fs.mkdirSync(this.pluginsDirectory, { recursive: true });
      }

      const filePath = path.join(this.pluginsDirectory, `${plugin.pluginName}.json`);
      const content = JSON.stringify(plugin, null, 2);
      
      fs.writeFileSync(filePath, content, 'utf-8');
      console.log(`💾 Saved plugin to file: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save plugin ${plugin.pluginName} to file:`, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Load plugin from specific JSON file
   */
  async loadPluginFromFile(filename: string): Promise<PluginDefinition | null> {
    if (typeof window !== 'undefined') return null;
    
    try {
      const filePath = path.join(this.pluginsDirectory, filename);
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const pluginData = JSON.parse(content);

      const validation = PluginDefinitionSchema.safeParse(pluginData);
      if (!validation.success) {
        throw new Error(`Invalid plugin definition: ${validation.error.message}`);
      }

      return validation.data;
    } catch (error) {
      console.error(`Failed to load plugin from ${filename}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Enhance plugin with LLM modifications
   */
  async enhancePluginWithLLM(pluginName: string, enhancementPrompt: string, llmFunction?: (prompt: string) => Promise<string>): Promise<PluginDefinition | null> {
    try {
      const plugin = this.plugins.get(pluginName);
      if (!plugin) {
        throw new Error(`Plugin not found: ${pluginName}`);
      }

      if (!plugin.metadata?.modifiable) {
        throw new Error(`Plugin ${pluginName} is not modifiable`);
      }

      console.log(`🤖 Enhancing plugin ${pluginName} with LLM...`);

      const enhancementContext = `
Original Plugin: ${plugin.pluginName}
Description: ${plugin.description}
Environment: ${plugin.executionContext}
Current Code:
\`\`\`javascript
${plugin.inlineCode}
\`\`\`

Enhancement Request: ${enhancementPrompt}

Please provide ONLY the enhanced JavaScript function code, maintaining the same function signature and return format.
`;

      let enhancedCode: string;
      if (llmFunction) {
        enhancedCode = await llmFunction(enhancementContext);
      } else {
        // Fallback enhancement (simple modifications)
        enhancedCode = this.applyBasicEnhancements(plugin.inlineCode, enhancementPrompt);
      }

      // Extract just the function code if wrapped in markdown
      const codeMatch = enhancedCode.match(/```(?:javascript|js)?\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        enhancedCode = codeMatch[1];
      }

      const enhancedPlugin: PluginDefinition = {
        ...plugin,
        version: `${plugin.version}-enhanced-${Date.now()}`,
        inlineCode: enhancedCode,
        metadata: {
          ...plugin.metadata,
          llmEnhanced: true,
          enhancementPrompt,
          enhancedAt: new Date().toISOString(),
          originalVersion: plugin.version
        }
      };

      // Validate enhanced plugin
      const validation = PluginDefinitionSchema.safeParse(enhancedPlugin);
      if (!validation.success) {
        throw new Error(`Enhanced plugin validation failed: ${validation.error.message}`);
      }

      // Save enhanced plugin
      await this.registerPlugin(enhancedPlugin);
      
      console.log(`✅ Plugin enhanced: ${pluginName} → ${enhancedPlugin.version}`);
      return enhancedPlugin;

    } catch (error) {
      console.error(`Failed to enhance plugin ${pluginName}:`, error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  private applyBasicEnhancements(originalCode: string, prompt: string): string {
    // Basic enhancement fallback - add error handling and logging
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('error handling') || lowerPrompt.includes('robust')) {
      return originalCode.replace(
        /^(async )?function\s+(\w+)\s*\([^)]*\)\s*{/,
        `$1function $2(...args) {
  try {
    console.log('🔧 Plugin execution started:', '$2', args);`
      ).replace(/}$/, `
  } catch (error) {
    console.error('❌ Plugin execution failed:', error);
    return { success: false, error: error.message, timestamp: new Date().toISOString() };
  }
}`);
    }

    if (lowerPrompt.includes('logging') || lowerPrompt.includes('debug')) {
      return originalCode.replace(
        /return\s*{/g,
        `console.log('📊 Plugin result:', arguments);
    return {`
      );
    }

    return originalCode;
  }

  /**
   * Register a new plugin or update existing one
   */
  async registerPlugin(plugin: PluginDefinition): Promise<void> {
    console.log(`🔌 Registering plugin: ${plugin.pluginName} v${plugin.version}`);
    
    // Validate plugin definition
    const validation = PluginDefinitionSchema.safeParse(plugin);
    if (!validation.success) {
      throw new Error(`Invalid plugin definition: ${validation.error.message}`);
    }

    // Store plugin in memory
    this.plugins.set(plugin.pluginName, plugin);
    
    // Save to localStorage for browser persistence
    await this.savePluginsToStorage();
    
    // Save to file for server persistence
    await this.savePluginToFile(plugin);
    
    console.log(`✅ Plugin registered: ${plugin.pluginName}`);
  }

  /**
   * Get a plugin by name
   */
  async getPlugin(name: string): Promise<PluginDefinition | null> {
    return this.plugins.get(name) || null;
  }

  /**
   * List all registered plugins
   */
  async listPlugins(): Promise<PluginDefinition[]> {
    return Array.from(this.plugins.values());
  }

  /**
   * Update an existing plugin
   */
  async updatePlugin(name: string, plugin: PluginDefinition): Promise<void> {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin not found: ${name}`);
    }

    console.log(`🔄 Updating plugin: ${name} to v${plugin.version}`);
    await this.registerPlugin(plugin);
  }

  /**
   * Delete a plugin
   */
  async deletePlugin(name: string): Promise<void> {
    if (!this.plugins.has(name)) {
      throw new Error(`Plugin not found: ${name}`);
    }

    this.plugins.delete(name);
    await this.savePluginsToStorage();
    
    // Also try to remove the file
    if (typeof window === 'undefined') {
      try {
        const filePath = path.join(this.pluginsDirectory, `${name}.json`);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`🗑️ Deleted plugin file: ${filePath}`);
        }
      } catch (error) {
        console.warn(`Failed to delete plugin file for ${name}:`, error instanceof Error ? error.message : 'Unknown error');
      }
    }
    
    console.log(`🗑️ Plugin deleted: ${name}`);
  }

  /**
   * Load plugins from localStorage (browser) or file system (server)
   */
  private loadPluginsFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        // Browser environment
        const stored = localStorage.getItem(this.storageKey);
        if (stored) {
          const pluginArray = JSON.parse(stored);
          for (const plugin of pluginArray) {
            this.plugins.set(plugin.pluginName, plugin);
          }
        }
      }
    } catch (error) {
      console.warn('Failed to load plugins from storage:', error);
    }
  }

  /**
   * Save plugins to storage
   */
  private async savePluginsToStorage(): Promise<void> {
    try {
      if (typeof window !== 'undefined') {
        // Browser environment
        const pluginArray = Array.from(this.plugins.values());
        localStorage.setItem(this.storageKey, JSON.stringify(pluginArray));
      }
    } catch (error) {
      console.warn('Failed to save plugins to storage:', error);
    }
  }
}