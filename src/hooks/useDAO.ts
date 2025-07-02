'use client';
import { useState, useEffect, useCallback } from 'react';
import { 
  ClientDAOService, 
  DAOData, 
  CreateDAORequest, 
  CreateDAOResponse,
  DeploymentInfo,
  getDAOService 
} from '../services/DAOService';

export interface UseDAOReturn {
  // State
  daos: DAOData[];
  currentDAO: DAOData | null;
  deploymentInfo: DeploymentInfo | null;
  isLoading: boolean;
  error: string | null;
  isDeployed: boolean;

  // Actions
  createDAO: (params: Omit<CreateDAORequest, 'action'>) => Promise<CreateDAOResponse>;
  loadAllDAOs: () => Promise<void>;
  loadDAO: (daoId: number) => Promise<void>;
  checkDeployment: () => Promise<void>;
  clearError: () => void;
  refreshDAOs: () => Promise<void>;
  
  // Utilities
  validateDAOParams: (params: Partial<CreateDAORequest>) => { isValid: boolean; errors: string[] };
}

/**
 * React hook for DAO operations
 * Provides state management and actions for DAO interactions
 */
export function useDAO(): UseDAOReturn {
  const [daoService, setDAOService] = useState<ClientDAOService | null>(null);
  const [daos, setDAOs] = useState<DAOData[]>([]);
  const [currentDAO, setCurrentDAO] = useState<DAOData | null>(null);
  const [deploymentInfo, setDeploymentInfo] = useState<DeploymentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeployed, setIsDeployed] = useState(false);

  // Initialize service
  useEffect(() => {
    let isMounted = true;
    
    getDAOService().then(service => {
      if (isMounted) {
        setDAOService(service);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load deployment info on service initialization
  useEffect(() => {
    if (daoService) {
      checkDeployment();
    }
  }, [daoService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const checkDeployment = useCallback(async () => {
    if (!daoService) return;

    try {
      setIsLoading(true);
      const result = await daoService.checkDeployment();
      
      setIsDeployed(result.isDeployed);
      setDeploymentInfo(result.info || null);
      
      if (!result.isDeployed) {
        setError(result.error || 'DAO Factory not deployed');
      } else {
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check deployment');
      setIsDeployed(false);
    } finally {
      setIsLoading(false);
    }
  }, [daoService]);

  const loadAllDAOs = useCallback(async () => {
    if (!daoService) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await daoService.getAllDAOs();
      
      if (result.success) {
        setDAOs(result.daos);
      } else {
        setError(result.error || 'Failed to load DAOs');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DAOs');
    } finally {
      setIsLoading(false);
    }
  }, [daoService]);

  const loadDAO = useCallback(async (daoId: number) => {
    if (!daoService) return;

    try {
      setIsLoading(true);
      setError(null);
      
      const result = await daoService.getDAO(daoId);
      
      if (result.success && result.dao) {
        setCurrentDAO(result.dao);
      } else {
        setError(result.error || 'Failed to load DAO');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load DAO');
    } finally {
      setIsLoading(false);
    }
  }, [daoService]);

  const createDAO = useCallback(async (params: Omit<CreateDAORequest, 'action'>): Promise<CreateDAOResponse> => {
    if (!daoService) {
      return {
        success: false,
        error: 'DAO service not initialized'
      };
    }

    try {
      setIsLoading(true);
      setError(null);
      
      // Validate parameters first
      const validation = daoService.validateDAOParams(params);
      if (!validation.isValid) {
        const errorMessage = `Validation failed: ${validation.errors.join(', ')}`;
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage
        };
      }
      
      const result = await daoService.createDAO(params);
      
      if (result.success) {
        // Refresh DAOs list after successful creation
        await loadAllDAOs();
      } else {
        setError(result.error || 'Failed to create DAO');
      }
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create DAO';
      setError(errorMessage);
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setIsLoading(false);
    }
  }, [daoService, loadAllDAOs]);

  const refreshDAOs = useCallback(async () => {
    if (daoService) {
      daoService.resetCache();
      await loadAllDAOs();
    }
  }, [daoService, loadAllDAOs]);

  const validateDAOParams = useCallback((params: Partial<CreateDAORequest>) => {
    if (!daoService) {
      return {
        isValid: false,
        errors: ['DAO service not initialized']
      };
    }
    
    return daoService.validateDAOParams(params);
  }, [daoService]);

  return {
    // State
    daos,
    currentDAO,
    deploymentInfo,
    isLoading,
    error,
    isDeployed,

    // Actions
    createDAO,
    loadAllDAOs,
    loadDAO,
    checkDeployment,
    clearError,
    refreshDAOs,
    
    // Utilities
    validateDAOParams
  };
}

/**
 * Hook for accessing a specific DAO by ID
 */
export function useDAOById(daoId: number | null) {
  const { loadDAO, currentDAO, isLoading, error } = useDAO();

  useEffect(() => {
    if (daoId !== null) {
      loadDAO(daoId);
    }
  }, [daoId, loadDAO]);

  return {
    dao: currentDAO,
    isLoading,
    error,
    reload: () => daoId !== null ? loadDAO(daoId) : Promise.resolve()
  };
}

/**
 * Hook for DAO deployment status monitoring
 */
export function useDAODeployment() {
  const { deploymentInfo, isDeployed, checkDeployment, isLoading, error } = useDAO();

  return {
    deploymentInfo,
    isDeployed,
    isLoading,
    error,
    checkDeployment
  };
}