// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VehicleCore} from "./VehicleCore.sol";
import {ServiceRecord} from "../libraries/VehicleTypes.sol";

/// @title ServiceHistoryModule
/// @notice Append-only maintenance records written by authorised service centres.
abstract contract ServiceHistoryModule is VehicleCore {
    mapping(string => ServiceRecord[]) private serviceHistory;

    event ServiceRecordAdded(string indexed vin, address indexed serviceCenter, uint256 odometer);

    function addServiceRecord(
        string calldata vin,
        uint256 odometer,
        string calldata serviceType,
        string calldata description,
        uint256 cost,
        string calldata invoiceCID
    ) external onlyRole(SERVICE_CENTER_ROLE) vehicleExists(vin) {
        _recordOdometer(vin, odometer);
        serviceHistory[vin].push(
            ServiceRecord(block.timestamp, odometer, serviceType, description, cost, invoiceCID, msg.sender)
        );
        emit ServiceRecordAdded(vin, msg.sender, odometer);
    }

    function getServiceHistory(string calldata vin) external view returns (ServiceRecord[] memory) {
        return serviceHistory[vin];
    }
}
