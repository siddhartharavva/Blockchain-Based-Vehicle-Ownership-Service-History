// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IVehicleNFT} from "./interfaces/IVehicleNFT.sol";

/// @title VehicleNFT
/// @notice ERC-721 "title token": one token per vehicle, held by the vehicle's current owner.
/// Tokens can only be minted or moved by the registry, so ownership can never change
/// without the seller -> buyer -> RTO approval flow.
contract VehicleNFT is ERC721, Ownable, IVehicleNFT {
    address public registry;
    string private baseTokenURI;
    mapping(uint256 => string) public vinOf;

    error NotRegistry(address caller);
    error RegistryAlreadySet();
    error TransferOnlyViaRegistry();

    event RegistrySet(address indexed registry);

    constructor(address initialOwner) ERC721("Vehicle Title", "VTITLE") Ownable(initialOwner) {}

    modifier onlyRegistry() {
        if (msg.sender != registry) revert NotRegistry(msg.sender);
        _;
    }

    /// @notice One-time wiring of the registry contract.
    function setRegistry(address registry_) external onlyOwner {
        if (registry != address(0)) revert RegistryAlreadySet();
        registry = registry_;
        emit RegistrySet(registry_);
    }

    /// @notice Base URI, e.g. "https://your-app/vehicle/" so tokenURI opens the public history page.
    function setBaseURI(string calldata uri) external onlyOwner {
        baseTokenURI = uri;
    }

    function mint(address to, uint256 tokenId, string calldata vin) external onlyRegistry {
        vinOf[tokenId] = vin;
        _mint(to, tokenId);
    }

    function move(address from, address to, uint256 tokenId) external onlyRegistry {
        _transfer(from, to, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        return string.concat(baseTokenURI, vinOf[tokenId]);
    }

    /// @dev Every mint/transfer passes through here; block anything not initiated by the registry.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (msg.sender != registry) revert TransferOnlyViaRegistry();
        return super._update(to, tokenId, auth);
    }
}
