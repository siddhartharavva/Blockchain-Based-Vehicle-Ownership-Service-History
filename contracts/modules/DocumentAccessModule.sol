// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VehicleCore} from "./VehicleCore.sol";
import {PrivateDocument} from "../libraries/VehicleTypes.sol";

/// @title DocumentAccessModule
/// @notice Owner-held private documents with time-limited access for a chosen viewer (e.g. a buyer).
/// @dev Grants are keyed by the owner who made them, so they lapse automatically when the vehicle is sold.
/// Contract storage is publicly readable on any blockchain, so this gates what the app shows;
/// genuinely confidential files should also be encrypted before upload (see README, Security).
abstract contract DocumentAccessModule is VehicleCore {
    mapping(string => PrivateDocument[]) private privateDocuments;
    // VIN -> granting owner -> viewer -> access expiry (unix seconds)
    mapping(string => mapping(address => mapping(address => uint256))) private accessExpiry;

    event PrivateDocumentAdded(string indexed vin, address indexed owner, string label);
    event DocumentAccessGranted(string indexed vin, address indexed owner, address indexed viewer, uint256 expiresAt);
    event DocumentAccessRevoked(string indexed vin, address indexed owner, address indexed viewer);

    error InvalidDuration();
    error AccessDenied(address viewer);

    function addPrivateDocument(
        string calldata vin,
        string calldata label,
        string calldata cid
    ) external vehicleExists(vin) onlyVehicleOwner(vin) {
        privateDocuments[vin].push(PrivateDocument(block.timestamp, label, cid, msg.sender));
        emit PrivateDocumentAdded(vin, msg.sender, label);
    }

    function grantDocumentAccess(
        string calldata vin,
        address viewer,
        uint256 durationSeconds
    ) external vehicleExists(vin) onlyVehicleOwner(vin) {
        if (viewer == address(0)) revert ZeroAddress();
        if (durationSeconds == 0) revert InvalidDuration();
        uint256 expiresAt = block.timestamp + durationSeconds;
        accessExpiry[vin][msg.sender][viewer] = expiresAt;
        emit DocumentAccessGranted(vin, msg.sender, viewer, expiresAt);
    }

    function revokeDocumentAccess(
        string calldata vin,
        address viewer
    ) external vehicleExists(vin) onlyVehicleOwner(vin) {
        delete accessExpiry[vin][msg.sender][viewer];
        emit DocumentAccessRevoked(vin, msg.sender, viewer);
    }

    function getDocumentAccessExpiry(string calldata vin, address viewer) external view returns (uint256) {
        return accessExpiry[vin][_ownerOf(vin)][viewer];
    }

    function canViewPrivateDocuments(string calldata vin, address viewer) public view returns (bool) {
        address owner = _ownerOf(vin);
        return viewer == owner || hasRole(RTO_ROLE, viewer) || accessExpiry[vin][owner][viewer] > block.timestamp;
    }

    function getPrivateDocuments(string calldata vin) external view returns (PrivateDocument[] memory) {
        if (!canViewPrivateDocuments(vin, msg.sender)) revert AccessDenied(msg.sender);
        return privateDocuments[vin];
    }
}
