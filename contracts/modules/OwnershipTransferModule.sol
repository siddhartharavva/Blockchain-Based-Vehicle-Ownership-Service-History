// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VehicleCore} from "./VehicleCore.sol";
import {TransferRequest} from "../libraries/VehicleTypes.sol";

/// @title OwnershipTransferModule
/// @notice Consent-based transfer: owner initiates -> buyer accepts -> RTO approves.
abstract contract OwnershipTransferModule is VehicleCore {
    mapping(string => TransferRequest) private transferRequests;
    string[] private pendingTransferVins;
    mapping(string => uint256) private pendingIndex; // VIN -> position in pendingTransferVins

    event TransferInitiated(string indexed vin, address indexed from, address indexed to);
    event TransferAccepted(string indexed vin, address indexed to);
    event TransferCancelled(string indexed vin);

    error InvalidBuyer(address buyer);
    error TransferAlreadyPending(string vin);
    error NoPendingTransfer(string vin);
    error NotBuyer(address caller);
    error BuyerHasNotAccepted(string vin);
    error NotTransferParty(address caller);

    modifier hasPendingTransfer(string calldata vin) {
        if (!transferRequests[vin].active) revert NoPendingTransfer(vin);
        _;
    }

    function initiateTransfer(
        string calldata vin,
        address to
    ) external vehicleExists(vin) onlyVehicleOwner(vin) {
        if (to == address(0) || to == msg.sender) revert InvalidBuyer(to);
        if (transferRequests[vin].active) revert TransferAlreadyPending(vin);
        _requireTransferable(vin);

        transferRequests[vin] = TransferRequest(msg.sender, to, false, true);
        pendingIndex[vin] = pendingTransferVins.length;
        pendingTransferVins.push(vin);
        emit TransferInitiated(vin, msg.sender, to);
    }

    function acceptTransfer(string calldata vin) external hasPendingTransfer(vin) {
        TransferRequest storage request = transferRequests[vin];
        if (request.to != msg.sender) revert NotBuyer(msg.sender);
        request.buyerAccepted = true;
        emit TransferAccepted(vin, msg.sender);
    }

    function approveTransfer(string calldata vin) external onlyRole(RTO_ROLE) hasPendingTransfer(vin) {
        TransferRequest memory request = transferRequests[vin];
        if (!request.buyerAccepted) revert BuyerHasNotAccepted(vin);
        _requireTransferable(vin); // the vehicle may have been flagged since the request was made
        _closeRequest(vin);
        _changeOwner(vin, request.to);
    }

    function cancelTransfer(string calldata vin) external hasPendingTransfer(vin) {
        TransferRequest storage request = transferRequests[vin];
        if (msg.sender != request.from && msg.sender != request.to) revert NotTransferParty(msg.sender);
        _closeRequest(vin);
        emit TransferCancelled(vin);
    }

    function getTransferRequest(string calldata vin) external view returns (TransferRequest memory) {
        return transferRequests[vin];
    }

    /// @notice VINs with an active transfer request (RTO approval queue, buyers' incoming requests).
    function getPendingTransferVins() external view returns (string[] memory) {
        return pendingTransferVins;
    }

    function _closeRequest(string calldata vin) private {
        delete transferRequests[vin];
        uint256 index = pendingIndex[vin];
        uint256 lastIndex = pendingTransferVins.length - 1;
        if (index != lastIndex) {
            string memory moved = pendingTransferVins[lastIndex];
            pendingTransferVins[index] = moved;
            pendingIndex[moved] = index;
        }
        pendingTransferVins.pop();
        delete pendingIndex[vin];
    }
}
