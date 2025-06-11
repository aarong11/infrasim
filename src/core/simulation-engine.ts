import { InfrastructureEntity, SimulationState, LogEntry, EntityType, FidelityLevel } from '../types/infrastructure';
import { generateOpenAPIStub } from '../utils/openApiStubGenerator';
import { v4 as uuidv4 } from 'uuid';

export class SimulationEngine {
  private state: SimulationState;
  private intervalId: NodeJS.Timeout | null = null;
  private listeners: ((state: SimulationState) => void)[] = [];

  constructor() {
    this.state = {
      entities: {},
      clock: 0,
      isRunning: false,
      tickRate: 1000,
    };
  }

  public getState(): SimulationState {
    return { ...this.state };
  }

  public addEntity(entity: Partial<InfrastructureEntity>): string {
    const id = entity.id || uuidv4();
    const fullEntity: InfrastructureEntity = {
      id,
      type: entity.type || EntityType.WEB_APP,
      name: entity.name || `Entity-${id.slice(0, 8)}`,
      hostname: entity.hostname || `host-${id.slice(0, 8)}.local`,
      ip: entity.ip || this.generateRandomIP(),
      fidelity: entity.fidelity || FidelityLevel.VIRTUAL,
      ports: entity.ports || [],
      metadata: entity.metadata || {},
      position: entity.position || { x: Math.random() * 800, y: Math.random() * 600 },
      connections: entity.connections || [],
      logs: entity.logs || [],
      apiSpec: entity.apiSpec,
    };

    this.state.entities[id] = fullEntity;
    this.notifyListeners();
    return id;
  }

  public removeEntity(id: string): void {
    delete this.state.entities[id];
    // Remove connections to this entity
    Object.values(this.state.entities).forEach(entity => {
      entity.connections = entity.connections.filter(connId => connId !== id);
    });
    this.notifyListeners();
  }

  public updateEntity(id: string, updatedEntity: Partial<InfrastructureEntity>): void {
    const entity = this.state.entities[id];
    if (entity) {
      this.state.entities[id] = {
        ...entity,
        ...updatedEntity,
      };
      this.notifyListeners();
    } else {
      console.warn(`Entity with ID ${id} not found.`);
    }
  }

  public updateEntityFidelity(id: string, fidelity: FidelityLevel): void {
    const entity = this.state.entities[id];
    if (entity) {
      entity.fidelity = fidelity;
      this.enhanceEntityWithFidelity(entity);
      this.notifyListeners();
    }
  }

  public start(): void {
    if (this.state.isRunning) return;
    
    this.state.isRunning = true;
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.state.tickRate);
    this.notifyListeners();
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.state.isRunning = false;
    this.notifyListeners();
  }

  public subscribe(listener: (state: SimulationState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private tick(): void {
    this.state.clock++;
    
    // Generate synthetic logs and activities
    Object.values(this.state.entities).forEach(entity => {
      if (Math.random() < 0.1) { // 10% chance per tick
        this.generateSyntheticLog(entity);
      }
    });

    this.notifyListeners();
  }

  private enhanceEntityWithFidelity(entity: InfrastructureEntity): void {
    switch (entity.fidelity) {
      case FidelityLevel.SEMI_REAL:
        this.addSemiRealFeatures(entity);
        break;
      case FidelityLevel.CONCRETE:
        this.addConcreteFeatures(entity);
        break;
    }
  }

  private addSemiRealFeatures(entity: InfrastructureEntity): void {
    // Add more realistic ports and services
    if (entity.type === EntityType.WEB_APP || entity.type === EntityType.API_SERVICE) {
      entity.ports = [
        { number: 80, protocol: 'tcp', service: 'http', status: 'open' },
        { number: 443, protocol: 'tcp', service: 'https', status: 'open' },
        { number: 22, protocol: 'tcp', service: 'ssh', status: 'open' },
      ];
    }
    
    // Generate OpenAPI stub for API services and web apps
    if (entity.type === EntityType.API_SERVICE || entity.type === EntityType.WEB_APP) {
      entity.metadata.openAPIStub = generateOpenAPIStub(entity);
    }
    
    // Generate basic API spec
    entity.apiSpec = this.generateBasicAPISpec(entity);
  }

  private addConcreteFeatures(entity: InfrastructureEntity): void {
    this.addSemiRealFeatures(entity);
    // Add more detailed metadata and realistic configurations
    entity.metadata = {
      ...entity.metadata,
      os: 'Ubuntu 22.04',
      version: '1.0.0',
      uptime: Math.floor(Math.random() * 1000000),
      cpu_usage: Math.random() * 100,
      memory_usage: Math.random() * 100,
    };
  }

  private generateBasicAPISpec(entity: InfrastructureEntity): any {
    return {
      openapi: '3.0.0',
      info: {
        title: `${entity.name} API`,
        version: '1.0.0',
      },
      paths: {
        '/health': {
          get: {
            summary: 'Health check',
            responses: { '200': { description: 'OK' } }
          }
        },
        '/status': {
          get: {
            summary: 'Status information',
            responses: { '200': { description: 'Status data' } }
          }
        }
      }
    };
  }

  private generateSyntheticLog(entity: InfrastructureEntity): void {
    const messages = [
      'Connection established',
      'Request processed successfully',
      'Authentication successful',
      'Cache miss',
      'Background task completed',
    ];

    const log: LogEntry = {
      timestamp: new Date(),
      level: Math.random() > 0.9 ? 'warn' : 'info',
      message: messages[Math.floor(Math.random() * messages.length)],
      source: entity.name,
    };

    entity.logs.unshift(log);
    if (entity.logs.length > 100) {
      entity.logs = entity.logs.slice(0, 100);
    }
  }

  private generateRandomIP(): string {
    return `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}
