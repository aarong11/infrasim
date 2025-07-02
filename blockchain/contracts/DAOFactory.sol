// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract DAOFactory is Ownable, ReentrancyGuard {
    struct DAO {
        string name;
        string symbol;
        address daoAddress;
        address creator;
        uint256 createdAt;
        bool isActive;
    }
    
    DAO[] public daos;
    mapping(address => uint256[]) public creatorDAOs;
    
    event DAOCreated(
        uint256 indexed daoId,
        string name,
        string symbol,
        address daoAddress,
        address creator
    );
    
    constructor() Ownable(msg.sender) {}
    
    function createDAO(
        string memory _name,
        string memory _symbol,
        string memory _description
    ) external nonReentrant returns (uint256) {
        // For now, just store the DAO info
        // In a full implementation, this would deploy a new DAO contract
        
        DAO memory newDAO = DAO({
            name: _name,
            symbol: _symbol,
            daoAddress: address(0), // Placeholder
            creator: msg.sender,
            createdAt: block.timestamp,
            isActive: true
        });
        
        daos.push(newDAO);
        uint256 daoId = daos.length - 1;
        creatorDAOs[msg.sender].push(daoId);
        
        emit DAOCreated(daoId, _name, _symbol, address(0), msg.sender);
        
        return daoId;
    }
    
    function getAllDAOs() external view returns (DAO[] memory) {
        return daos;
    }
    
    function getDAOsByCreator(address creator) external view returns (uint256[] memory) {
        return creatorDAOs[creator];
    }
    
    function getTotalDAOs() external view returns (uint256) {
        return daos.length;
    }
}