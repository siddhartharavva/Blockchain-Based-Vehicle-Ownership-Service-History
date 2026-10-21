// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VehicleCore} from "./VehicleCore.sol";
import {LoanRecord} from "../libraries/VehicleTypes.sol";

/// @title LoanModule
/// @notice Loan / hypothecation records by banks. A vehicle with an active loan cannot be transferred.
abstract contract LoanModule is VehicleCore {
    mapping(string => LoanRecord[]) private loanHistory;

    event LoanAdded(string indexed vin, address indexed lender, uint256 amount);
    event LoanCleared(string indexed vin, address indexed lender);

    error ActiveLoanExists(string vin);
    error NoActiveLoan(string vin);
    error NotLender(address caller);

    function addLoan(
        string calldata vin,
        uint256 amount,
        string calldata documentCID
    ) external onlyRole(BANK_ROLE) vehicleExists(vin) {
        if (hasActiveLoan(vin)) revert ActiveLoanExists(vin);
        loanHistory[vin].push(LoanRecord(msg.sender, amount, documentCID, block.timestamp, 0, true));
        emit LoanAdded(vin, msg.sender, amount);
    }

    /// @notice Only the bank that recorded the loan can clear it.
    function clearLoan(string calldata vin) external onlyRole(BANK_ROLE) {
        if (!hasActiveLoan(vin)) revert NoActiveLoan(vin);
        LoanRecord storage loan = loanHistory[vin][loanHistory[vin].length - 1];
        if (loan.lender != msg.sender) revert NotLender(msg.sender);
        loan.active = false;
        loan.clearedAt = block.timestamp;
        emit LoanCleared(vin, msg.sender);
    }

    function getLoanHistory(string calldata vin) external view returns (LoanRecord[] memory) {
        return loanHistory[vin];
    }

    /// @dev Only the latest loan can be active, because addLoan refuses a second one.
    function hasActiveLoan(string calldata vin) public view returns (bool) {
        LoanRecord[] storage loans = loanHistory[vin];
        return loans.length != 0 && loans[loans.length - 1].active;
    }

    function _requireTransferable(string calldata vin) internal view virtual override {
        super._requireTransferable(vin);
        if (hasActiveLoan(vin)) revert ActiveLoanExists(vin);
    }
}
