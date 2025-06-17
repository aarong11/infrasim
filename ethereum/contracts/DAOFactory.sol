// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract DAOFactory {
    event DAOCreated(
        address indexed creator,
        address daoAddress,
        string name,
        string symbol,
        string jurisdiction,
        string mission,
        string constitution,
        string[] roles,
        address[] roleHolders
    );

    struct DAO {
        string name;
        string symbol;
        string jurisdiction;
        string mission;
        string constitution;
        address creator;
        address[] members;
        string[] roles;
    }

    DAO[] public daos;

    function createDAO(
        string memory name,
        string memory symbol,
        string memory jurisdiction,
        string memory mission,
        string memory constitution,
        string[] memory roles,
        address[] memory roleHolders
    ) external returns (uint daoId) {
        require(roles.length == roleHolders.length, "Mismatched roles and holders");

        DAO memory newDao = DAO({
            name: name,
            symbol: symbol,
            jurisdiction: jurisdiction,
            mission: mission,
            constitution: constitution,
            creator: msg.sender,
            members: roleHolders,
            roles: roles
        });

        daos.push(newDao);
        daoId = daos.length - 1;

        emit DAOCreated(
            msg.sender,
            address(this),
            name,
            symbol,
            jurisdiction,
            mission,
            constitution,
            roles,
            roleHolders
        );
    }

    function getDAO(uint daoId) external view returns (DAO memory) {
        require(daoId < daos.length, "Invalid DAO ID");
        return daos[daoId];
    }

    function totalDAOs() external view returns (uint) {
        return daos.length;
    }
}