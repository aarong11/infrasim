'use client';

import React from 'react';
import ELK from 'elkjs/lib/elk.bundled.js';
import { Node, Edge } from 'reactflow';
import { InfrastructureEntity } from '../types/infrastructure';

export interface LayoutOptions {
  algorithm: 'layered' | 'force' | 'mrtree';
  nodeSpacing: number;
  layerSpacing: number;
  direction: 'RIGHT' | 'DOWN' | 'LEFT' | 'UP';
}

export interface SavedLayout {
  positions: Record<string, { x: number; y: number }>;
  timestamp: number;
  entityCount: number;
}

const DEFAULT_LAYOUT_OPTIONS: LayoutOptions = {
  algorithm: 'layered',
  nodeSpacing: 150,
  layerSpacing: 200,
  direction: 'RIGHT',
};

class LayoutManager {
  private elk: any;
  private storageKey: string;

  constructor(storageKey: string = 'infrastructure-layout') {
    this.elk = new ELK();
    this.storageKey = storageKey;
  }

  /**
   * Check if a saved layout exists and is still valid
   */
  hasSavedLayout(entities: Record<string, InfrastructureEntity>): boolean {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return false;

      const layout: SavedLayout = JSON.parse(saved);
      const currentEntityIds = Object.keys(entities);
      const savedEntityIds = Object.keys(layout.positions);

      // Check if entity count and IDs match
      return (
        layout.entityCount === currentEntityIds.length &&
        currentEntityIds.every(id => id in layout.positions) &&
        savedEntityIds.every(id => id in entities)
      );
    } catch (error) {
      console.warn('Error checking saved layout:', error);
      return false;
    }
  }

  /**
   * Load saved positions from localStorage
   */
  loadSavedLayout(entities: Record<string, InfrastructureEntity>): Record<string, { x: number; y: number }> | null {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (!saved) return null;

      const layout: SavedLayout = JSON.parse(saved);
      
      if (!this.hasSavedLayout(entities)) {
        // Clean up invalid saved layout
        localStorage.removeItem(this.storageKey);
        return null;
      }

      return layout.positions;
    } catch (error) {
      console.warn('Error loading saved layout:', error);
      localStorage.removeItem(this.storageKey);
      return null;
    }
  }

  /**
   * Save current positions to localStorage
   */
  saveLayout(entities: Record<string, InfrastructureEntity>): void {
    try {
      const positions: Record<string, { x: number; y: number }> = {};
      
      Object.values(entities).forEach(entity => {
        positions[entity.id] = { x: entity.position.x, y: entity.position.y };
      });

      const layout: SavedLayout = {
        positions,
        timestamp: Date.now(),
        entityCount: Object.keys(entities).length,
      };

      localStorage.setItem(this.storageKey, JSON.stringify(layout));
    } catch (error) {
      console.warn('Error saving layout:', error);
    }
  }

  /**
   * Generate automatic layout using ELK
   */
  async generateAutoLayout(
    entities: Record<string, InfrastructureEntity>,
    options: Partial<LayoutOptions> = {}
  ): Promise<Record<string, { x: number; y: number }>> {
    const layoutOptions = { ...DEFAULT_LAYOUT_OPTIONS, ...options };
    
    // Convert entities to ELK graph format
    const elkNodes = Object.values(entities).map(entity => ({
      id: entity.id,
      width: 200, // Standard node width
      height: 100, // Standard node height
    }));

    const elkEdges: any[] = [];
    Object.values(entities).forEach(entity => {
      entity.connections.forEach(targetId => {
        if (entities[targetId]) {
          elkEdges.push({
            id: `${entity.id}-${targetId}`,
            sources: [entity.id],
            targets: [targetId],
          });
        }
      });
    });

    const elkGraph = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': layoutOptions.algorithm,
        'elk.direction': layoutOptions.direction,
        'elk.spacing.nodeNode': layoutOptions.nodeSpacing.toString(),
        'elk.layered.spacing.nodeNodeBetweenLayers': layoutOptions.layerSpacing.toString(),
        'elk.spacing.edgeNode': '40',
        'elk.spacing.edgeEdge': '20',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      },
      children: elkNodes,
      edges: elkEdges,
    };

    try {
      const layoutedGraph = await this.elk.layout(elkGraph);
      const positions: Record<string, { x: number; y: number }> = {};

      layoutedGraph.children?.forEach(node => {
        if (node.x !== undefined && node.y !== undefined) {
          positions[node.id] = {
            x: node.x,
            y: node.y,
          };
        }
      });

      return positions;
    } catch (error) {
      console.error('ELK layout failed:', error);
      // Fallback to simple grid layout
      return this.generateGridLayout(entities);
    }
  }

  /**
   * Fallback grid layout when ELK fails
   */
  private generateGridLayout(entities: Record<string, InfrastructureEntity>): Record<string, { x: number; y: number }> {
    const positions: Record<string, { x: number; y: number }> = {};
    const entityIds = Object.keys(entities);
    const cols = Math.ceil(Math.sqrt(entityIds.length));
    
    entityIds.forEach((id, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;
      positions[id] = {
        x: col * 250,
        y: row * 150,
      };
    });

    return positions;
  }

  /**
   * Clear saved layout
   */
  clearSavedLayout(): void {
    localStorage.removeItem(this.storageKey);
  }
}

export default LayoutManager;