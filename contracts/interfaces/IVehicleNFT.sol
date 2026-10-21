// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice The only operations the registry needs from the title token.
/// The registry depends on this abstraction, not on the concrete ERC-721 contract.
interface IVehicleNFT {
    function mint(address to, uint256 tokenId, string calldata vin) external;

    function move(address from, address to, uint256 tokenId) external;
}
