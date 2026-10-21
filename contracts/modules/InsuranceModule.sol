// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VehicleCore} from "./VehicleCore.sol";
import {AccidentRecord, InsurancePolicy} from "../libraries/VehicleTypes.sol";

/// @title InsuranceModule
/// @notice Insurance policies and accident / claim records written by insurers.
abstract contract InsuranceModule is VehicleCore {
    mapping(string => AccidentRecord[]) private accidentHistory;
    mapping(string => InsurancePolicy[]) private insurancePolicies;

    event AccidentRecordAdded(string indexed vin, address indexed insurer, string severity);
    event InsurancePolicyAdded(string indexed vin, address indexed insurer, string policyNumber);

    error InvalidPolicyPeriod(uint256 validFrom, uint256 validUntil);

    function addAccidentRecord(
        string calldata vin,
        string calldata description,
        string calldata severity,
        uint256 claimAmount,
        string calldata reportCID
    ) external onlyRole(INSURER_ROLE) vehicleExists(vin) {
        accidentHistory[vin].push(
            AccidentRecord(block.timestamp, description, severity, claimAmount, reportCID, msg.sender)
        );
        emit AccidentRecordAdded(vin, msg.sender, severity);
    }

    function addInsurancePolicy(
        string calldata vin,
        string calldata policyNumber,
        uint256 validFrom,
        uint256 validUntil,
        string calldata policyCID
    ) external onlyRole(INSURER_ROLE) vehicleExists(vin) {
        if (validUntil <= validFrom) revert InvalidPolicyPeriod(validFrom, validUntil);
        insurancePolicies[vin].push(
            InsurancePolicy(block.timestamp, policyNumber, validFrom, validUntil, policyCID, msg.sender)
        );
        emit InsurancePolicyAdded(vin, msg.sender, policyNumber);
    }

    function getAccidentHistory(string calldata vin) external view returns (AccidentRecord[] memory) {
        return accidentHistory[vin];
    }

    function getInsurancePolicies(string calldata vin) external view returns (InsurancePolicy[] memory) {
        return insurancePolicies[vin];
    }
}
