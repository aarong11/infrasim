import React, { useState, useCallback, useRef, useEffect } from 'react';
import { APIThrottler } from '@utils/api-throttler';

export const useEntityExpansion = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // API throttling
  const apiThrottler = useRef(new APIThrottler({
    minInterval: 1000,
    maxBackoff: 30000,
    maxRetries: 3,
    baseBackoff: 2000
  }));

  const expandEntity = async (
    companyId: string,
    entityType: string,
    description: string,
    onSuccess?: (result: any) => void
  ) => {
    if (!companyId || !entityType || !description.trim()) {
      setError('Please provide company ID, entity type, and description');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiThrottler.current.throttledCall(
        () => fetch('/api/vector-memory', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'expandInfrastructure',
            companyId,
            entityType,
            description,
            fidelityLevel: 'detailed'
          })
        }),
        `expand-entity-${companyId}-${entityType}`
      );

      if (!response.ok) {
        throw new Error(`Failed to expand entity: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to expand entity');
      }

      if (onSuccess) {
        onSuccess(result);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Entity expansion error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetThrottling = () => {
    apiThrottler.current.resetAll();
  };

  return {
    expandEntity,
    loading,
    error,
    resetThrottling
  };
};