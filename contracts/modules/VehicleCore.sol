// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {RegistryAccess} from "./RegistryAccess.sol";
import {IVehicleNFT} from "../interfaces/IVehicleNFT.sol";
import {Vehicle, VehicleSpec, OwnershipRecord} from "../libraries/VehicleTypes.sol";

/// @title VehicleCore
/// @notice Vehicle registration, ownership bookkeeping, odometer and stolen-flag state.
/// Other modules build on the internal helpers here instead of touching storage directly.
abstract contract VehicleCore is RegistryAccess {
    uint256 public constant VIN_LENGTH = 17;

    IVehicleNFT public immutable vehicleNFT;

    mapping(string => Vehicle) private vehicles;
    mapping(string => OwnershipRecord[]) private ownershipHistory;
    mapping(address => string[]) private ownerVehicles;
    mapping(string => uint256) private ownerVehicleIndex; // VIN -> position in ownerVehicles[owner]
    mapping(string => string) private regNumberToVin;
    string[] private allVins;

    event VehicleRegistered(string indexed vin, address indexed owner, address indexed rto);
    event RegistrationNumberAssigned(string indexed vin, string registrationNumber, address indexed rto);
    event StolenStatusChanged(string indexed vin, bool isStolen);
    event OwnershipTransferred(string indexed vin, address indexed from, address indexed to);

    error InvalidVinLength(uint256 length);
    error VehicleAlreadyExists(string vin);
    error VehicleNotFound(string vin);
    error RegistrationNumberTaken(string registrationNumber);
    error RegistrationNumberRequired();
    error RegistrationNumberAlreadyAssigned(string vin);
    error OdometerRollback(uint256 lastOdometer, uint256 newOdometer);
    error VehicleIsStolen(string vin);
    error NotVehicleOwner(address caller);

    constructor(address admin, IVehicleNFT nft) RegistryAccess(admin) {
        if (address(nft) == address(0)) revert ZeroAddress();
        vehicleNFT = nft;
    }

    modifier vehicleExists(string calldata vin) {
        if (!vehicles[vin].exists) revert VehicleNotFound(vin);
        _;
    }

    modifier onlyVehicleOwner(string calldata vin) {
        if (vehicles[vin].currentOwner != msg.sender) revert NotVehicleOwner(msg.sender);
        _;
    }

    // ---------------------------------------------------------------- writes

    /// @notice RTO registers a vehicle with its number plate.
    function registerVehicle(VehicleSpec calldata spec) external onlyRole(RTO_ROLE) {
        if (bytes(spec.registrationNumber).length == 0) revert RegistrationNumberRequired();
        _createVehicle(spec);
    }

    /// @notice Manufacturer / dealer creates the initial record; the RTO assigns the number plate later.
    function manufactureVehicle(VehicleSpec calldata spec) external onlyRole(MANUFACTURER_ROLE) {
        if (bytes(spec.registrationNumber).length != 0) revert RegistrationNumberAlreadyAssigned(spec.vin);
        _createVehicle(spec);
    }

    function assignRegistrationNumber(
        string calldata vin,
        string calldata registrationNumber
    ) external onlyRole(RTO_ROLE) vehicleExists(vin) {
        if (bytes(vehicles[vin].registrationNumber).length != 0) revert RegistrationNumberAlreadyAssigned(vin);
        if (bytes(registrationNumber).length == 0) revert RegistrationNumberRequired();
        _claimRegistrationNumber(vin, registrationNumber);
        vehicles[vin].registrationNumber = registrationNumber;
        emit RegistrationNumberAssigned(vin, registrationNumber, msg.sender);
    }

    function setStolenStatus(string calldata vin, bool stolen) external onlyRole(RTO_ROLE) vehicleExists(vin) {
        vehicles[vin].isStolen = stolen;
        emit StolenStatusChanged(vin, stolen);
    }

    // ---------------------------------------------------------------- reads

    function getVehicle(string calldata vin) external view vehicleExists(vin) returns (Vehicle memory) {
        return vehicles[vin];
    }

    function vehicleExistsByVin(string calldata vin) external view returns (bool) {
        return vehicles[vin].exists;
    }

    function getOwnershipHistory(string calldata vin) external view returns (OwnershipRecord[] memory) {
        return ownershipHistory[vin];
    }

    function getVehiclesByOwner(address owner) external view returns (string[] memory) {
        return ownerVehicles[owner];
    }

    function getVinByRegNumber(string calldata registrationNumber) external view returns (string memory) {
        return regNumberToVin[registrationNumber];
    }

    function getAllVins() external view returns (string[] memory) {
        return allVins;
    }

    function getVehicleCount() external view returns (uint256) {
        return allVins.length;
    }

    /// @notice ERC-721 token id of a vehicle's title token (derived from the VIN, so no extra storage).
    function tokenIdOf(string memory vin) public pure returns (uint256) {
        return uint256(keccak256(bytes(vin)));
    }

    // ---------------------------------------------------------------- internal helpers

    function _createVehicle(VehicleSpec calldata spec) private {
        uint256 vinLength = bytes(spec.vin).length;
        if (vinLength != VIN_LENGTH) revert InvalidVinLength(vinLength);
        if (vehicles[spec.vin].exists) revert VehicleAlreadyExists(spec.vin);
        if (spec.owner == address(0)) revert ZeroAddress();
        if (bytes(spec.registrationNumber).length != 0) {
            _claimRegistrationNumber(spec.vin, spec.registrationNumber);
        }

        vehicles[spec.vin] = Vehicle({
            vin: spec.vin,
            registrationNumber: spec.registrationNumber,
            make: spec.make,
            model: spec.model,
            year: spec.year,
            color: spec.color,
            engineNumber: spec.engineNumber,
            currentOwner: spec.owner,
            lastOdometer: 0,
            documentCID: spec.documentCID,
            isStolen: false,
            exists: true,
            registeredAt: block.timestamp
        });
        allVins.push(spec.vin);
        ownershipHistory[spec.vin].push(OwnershipRecord(spec.owner, block.timestamp, 0));
        _addToOwner(spec.owner, spec.vin);
        vehicleNFT.mint(spec.owner, tokenIdOf(spec.vin), spec.vin);

        emit VehicleRegistered(spec.vin, spec.owner, msg.sender);
    }

    function _claimRegistrationNumber(string calldata vin, string calldata registrationNumber) private {
        if (bytes(regNumberToVin[registrationNumber]).length != 0) {
            revert RegistrationNumberTaken(registrationNumber);
        }
        regNumberToVin[registrationNumber] = vin;
    }

    /// @dev Single place where ownership changes: history, owner index and title token stay in sync.
    function _changeOwner(string calldata vin, address newOwner) internal {
        Vehicle storage vehicle = vehicles[vin];
        address previousOwner = vehicle.currentOwner;

        OwnershipRecord[] storage history = ownershipHistory[vin];
        history[history.length - 1].toTimestamp = block.timestamp;
        history.push(OwnershipRecord(newOwner, block.timestamp, 0));

        _removeFromOwner(previousOwner, vin);
        _addToOwner(newOwner, vin);
        vehicle.currentOwner = newOwner;
        vehicleNFT.move(previousOwner, newOwner, tokenIdOf(vin));

        emit OwnershipTransferred(vin, previousOwner, newOwner);
    }

    /// @dev Anti-rollback check shared by every module that records an odometer reading.
    function _recordOdometer(string calldata vin, uint256 odometer) internal {
        uint256 last = vehicles[vin].lastOdometer;
        if (odometer < last) revert OdometerRollback(last, odometer);
        vehicles[vin].lastOdometer = odometer;
    }

    /// @dev Reverts if the vehicle may not change hands. Modules extend this (Open/Closed)
    /// by overriding and calling super, e.g. the loan module adds the hypothecation check.
    function _requireTransferable(string calldata vin) internal view virtual {
        if (vehicles[vin].isStolen) revert VehicleIsStolen(vin);
    }

    function _ownerOf(string calldata vin) internal view returns (address) {
        return vehicles[vin].currentOwner;
    }

    function _addToOwner(address owner, string calldata vin) private {
        ownerVehicleIndex[vin] = ownerVehicles[owner].length;
        ownerVehicles[owner].push(vin);
    }

    function _removeFromOwner(address owner, string calldata vin) private {
        string[] storage list = ownerVehicles[owner];
        uint256 index = ownerVehicleIndex[vin];
        uint256 lastIndex = list.length - 1;
        if (index != lastIndex) {
            string memory moved = list[lastIndex];
            list[index] = moved;
            ownerVehicleIndex[moved] = index;
        }
        list.pop();
        delete ownerVehicleIndex[vin];
    }
}
