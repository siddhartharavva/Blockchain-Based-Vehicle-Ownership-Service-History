// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IVehicleNFT} from "./interfaces/IVehicleNFT.sol";
import {VehicleCore} from "./modules/VehicleCore.sol";
import {OwnershipTransferModule} from "./modules/OwnershipTransferModule.sol";
import {ServiceHistoryModule} from "./modules/ServiceHistoryModule.sol";
import {InsuranceModule} from "./modules/InsuranceModule.sol";
import {LoanModule} from "./modules/LoanModule.sol";
import {DocumentAccessModule} from "./modules/DocumentAccessModule.sol";

/// @title VehicleRegistry
/// @notice Single deployable registry for vehicle ownership and service history.
/// Each concern lives in its own module (single responsibility); this contract only composes them,
/// so the frontend talks to one address and one ABI.
contract VehicleRegistry is
    OwnershipTransferModule,
    ServiceHistoryModule,
    InsuranceModule,
    LoanModule,
    DocumentAccessModule
{
    constructor(address admin, IVehicleNFT nft) VehicleCore(admin, nft) {}

    function _requireTransferable(string calldata vin) internal view override(VehicleCore, LoanModule) {
        super._requireTransferable(vin);
    }
}
