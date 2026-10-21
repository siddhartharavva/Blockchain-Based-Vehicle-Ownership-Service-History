// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Shared data types used by every registry module.
/// Kept in one file so each struct is defined exactly once.

struct Vehicle {
    string vin;
    string registrationNumber;
    string make;
    string model;
    uint16 year;
    string color;
    string engineNumber;
    address currentOwner;
    uint256 lastOdometer;
    string documentCID; // RC / registration document on IPFS
    bool isStolen;
    bool exists;
    uint256 registeredAt;
}

/// @notice Input bundle for creating a vehicle (avoids "stack too deep" and long parameter lists).
struct VehicleSpec {
    string vin;
    string registrationNumber;
    string make;
    string model;
    uint16 year;
    string color;
    string engineNumber;
    address owner;
    string documentCID;
}

struct OwnershipRecord {
    address owner;
    uint256 fromTimestamp;
    uint256 toTimestamp; // 0 while current owner
}

struct ServiceRecord {
    uint256 timestamp;
    uint256 odometer;
    string serviceType; // "General Service", "Oil Change", "Repair", "Correction", ...
    string description;
    uint256 cost; // in rupees (whole number)
    string invoiceCID;
    address serviceCenter;
}

struct AccidentRecord {
    uint256 timestamp;
    string description;
    string severity; // "Minor", "Major", "Total Loss"
    uint256 claimAmount;
    string reportCID;
    address insurer;
}

struct InsurancePolicy {
    uint256 timestamp;
    string policyNumber;
    uint256 validFrom;
    uint256 validUntil;
    string policyCID;
    address insurer;
}

struct TransferRequest {
    address from;
    address to;
    bool buyerAccepted;
    bool active;
}

struct LoanRecord {
    address lender;
    uint256 amount; // in rupees (whole number)
    string documentCID;
    uint256 startedAt;
    uint256 clearedAt; // 0 while active
    bool active;
}

struct PrivateDocument {
    uint256 timestamp;
    string label;
    string cid;
    address addedBy;
}
