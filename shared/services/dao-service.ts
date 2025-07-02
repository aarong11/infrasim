import { SmartContractService } from './smart-contract-service';
import { IWalletProvider, ContractResult, TransactionOptions } from '../types/wallet';

export interface DAOInfo {
  address: string;
  name: string;
  description: string;
  creator: string;
  votingPeriod: number;
  proposalThreshold: number;
  createdAt?: string;
}

export interface CreateDAOParams {
  name: string;
  description: string;
  votingPeriod: number;
  proposalThreshold: number;
}

export class DAOService {
  private contractService: SmartContractService;

  constructor(walletProvider: IWalletProvider) {
    this.contractService = new SmartContractService(walletProvider);
  }

  public setWalletProvider(walletProvider: IWalletProvider): void {
    this.contractService.setWalletProvider(walletProvider);
  }

  public async createDAO(params: CreateDAOParams, options: TransactionOptions = {}): Promise<ContractResult<string>> {
    try {
      const result = await this.contractService.sendToDeployedContract(
        'DAOFactory',
        'createDAO',
        [params.name, params.description, params.votingPeriod, params.proposalThreshold],
        options
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create DAO'
      };
    }
  }

  public async getTotalDAOs(): Promise<ContractResult<number>> {
    try {
      const result = await this.contractService.callDeployedContract<bigint>(
        'DAOFactory',
        'totalDAOs'
      );

      if (result.success && result.data !== undefined) {
        return {
          success: true,
          data: Number(result.data)
        };
      }

      return {
        success: false,
        error: result.error || 'Failed to get total DAOs'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get total DAOs'
      };
    }
  }

  public async getDAOAddress(index: number): Promise<ContractResult<string>> {
    try {
      const result = await this.contractService.callDeployedContract<string>(
        'DAOFactory',
        'daos',
        [index]
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get DAO address'
      };
    }
  }

  public async getDAOCreator(daoAddress: string): Promise<ContractResult<string>> {
    try {
      const result = await this.contractService.callDeployedContract<string>(
        'DAOFactory',
        'daoCreators',
        [daoAddress]
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get DAO creator'
      };
    }
  }

  public async isDAO(address: string): Promise<ContractResult<boolean>> {
    try {
      const result = await this.contractService.callDeployedContract<boolean>(
        'DAOFactory',
        'isDAO',
        [address]
      );

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check if address is DAO'
      };
    }
  }

  public async getAllDAOs(): Promise<ContractResult<DAOInfo[]>> {
    try {
      const totalResult = await this.getTotalDAOs();
      if (!totalResult.success || !totalResult.data) {
        return {
          success: false,
          error: totalResult.error || 'Failed to get total DAOs'
        };
      }

      const daos: DAOInfo[] = [];
      const total = totalResult.data;

      for (let i = 0; i < total; i++) {
        const addressResult = await this.getDAOAddress(i);
        if (addressResult.success && addressResult.data) {
          const creatorResult = await this.getDAOCreator(addressResult.data);
          
          daos.push({
            address: addressResult.data,
            name: `DAO ${i + 1}`, // Could be enhanced to get actual name from DAO contract
            description: 'DAO Description', // Could be enhanced to get actual description
            creator: creatorResult.success ? creatorResult.data! : 'Unknown',
            votingPeriod: 0, // Could be enhanced to get from DAO contract
            proposalThreshold: 0 // Could be enhanced to get from DAO contract
          });
        }
      }

      return {
        success: true,
        data: daos
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get all DAOs'
      };
    }
  }

  public async estimateCreateDAOGas(params: CreateDAOParams): Promise<ContractResult<string>> {
    try {
      const factoryAddress = this.contractService.getContractAddress('DAOFactory');
      if (!factoryAddress) {
        return {
          success: false,
          error: 'DAOFactory contract not found'
        };
      }

      const abi = [
        'function createDAO(string memory name, string memory description, uint256 votingPeriod, uint256 proposalThreshold) external returns (address)'
      ];

      const gasEstimate = await this.contractService.estimateGas(
        factoryAddress,
        abi,
        'createDAO',
        [params.name, params.description, params.votingPeriod, params.proposalThreshold]
      );

      return {
        success: true,
        data: gasEstimate
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to estimate gas'
      };
    }
  }

  // Get the underlying contract service for advanced usage
  public getContractService(): SmartContractService {
    return this.contractService;
  }
}