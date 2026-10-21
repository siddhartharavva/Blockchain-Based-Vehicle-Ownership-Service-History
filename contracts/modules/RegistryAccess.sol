// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {AccessControlEnumerable} from "@openzeppelin/contracts/access/extensions/AccessControlEnumerable.sol";

/// @title RegistryAccess
/// @notice Roles and display names for the organisations that write records.
/// DEFAULT_ADMIN_ROLE (from OpenZeppelin) is the admin who grants and revokes the other roles.
abstract contract RegistryAccess is AccessControlEnumerable {
    bytes32 public constant RTO_ROLE = keccak256("RTO_ROLE");
    bytes32 public constant SERVICE_CENTER_ROLE = keccak256("SERVICE_CENTER_ROLE");
    bytes32 public constant INSURER_ROLE = keccak256("INSURER_ROLE");
    bytes32 public constant MANUFACTURER_ROLE = keccak256("MANUFACTURER_ROLE");
    bytes32 public constant BANK_ROLE = keccak256("BANK_ROLE");

    /// @notice Public label for an organisation's wallet, e.g. "Hyderabad RTO" or "Speedy Motors".
    /// Only organisations get names; owners stay pseudonymous (no personal data on-chain).
    mapping(address => string) private entityNames;

    event EntityNameSet(address indexed account, string name);

    error ZeroAddress();

    constructor(address admin) {
        if (admin == address(0)) revert ZeroAddress();
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
    }

    function setEntityName(address account, string calldata name) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (account == address(0)) revert ZeroAddress();
        entityNames[account] = name;
        emit EntityNameSet(account, name);
    }

    function getEntityName(address account) external view returns (string memory) {
        return entityNames[account];
    }
}
