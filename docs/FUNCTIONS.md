# Function Registry

One row per function, with the single file that owns it. When adding a feature, look here first and reuse
the existing function instead of writing a second one. Every frontend call to the contract goes through
`RegistryService`; every transaction goes through `useTransaction`; every data load goes through `useAsync`.

## Smart contracts

### Shared internal helpers (used by several modules)

| Function | Owner | Used by |
|---|---|---|
| `_changeOwner(vin, newOwner)` | VehicleCore | `approveTransfer`. The only place ownership changes: history, owner index and NFT stay in sync |
| `_recordOdometer(vin, km)` | VehicleCore | `addServiceRecord`. The only anti-rollback check |
| `_requireTransferable(vin)` (virtual) | VehicleCore, extended by LoanModule | `initiateTransfer`, `approveTransfer` |
| `_ownerOf(vin)` | VehicleCore | DocumentAccessModule |
| `_createVehicle(spec)` (private) | VehicleCore | `registerVehicle`, `manufactureVehicle` |
| `_claimRegistrationNumber(vin, regNo)` (private) | VehicleCore | `_createVehicle`, `assignRegistrationNumber` |
| `_addToOwner` / `_removeFromOwner` (private) | VehicleCore | `_createVehicle`, `_changeOwner` |
| `_closeRequest(vin)` (private) | OwnershipTransferModule | `approveTransfer`, `cancelTransfer` |
| modifiers `vehicleExists`, `onlyVehicleOwner` | VehicleCore | every module |
| modifier `hasPendingTransfer` | OwnershipTransferModule | accept / approve / cancel |

### Public functions

| Function | Module | Caller |
|---|---|---|
| `grantRole`, `revokeRole`, `hasRole`, `getRoleMembers` | OpenZeppelin AccessControlEnumerable | Admin / anyone |
| `setEntityName`, `getEntityName` | RegistryAccess | Admin / anyone |
| `registerVehicle(spec)` | VehicleCore | RTO |
| `manufactureVehicle(spec)` | VehicleCore | Manufacturer |
| `assignRegistrationNumber(vin, regNo)` | VehicleCore | RTO |
| `setStolenStatus(vin, bool)` | VehicleCore | RTO |
| `getVehicle`, `vehicleExistsByVin`, `getOwnershipHistory`, `getVehiclesByOwner`, `getVinByRegNumber`, `getAllVins`, `getVehicleCount`, `tokenIdOf` | VehicleCore | anyone |
| `initiateTransfer`, `acceptTransfer`, `approveTransfer`, `cancelTransfer` | OwnershipTransferModule | owner / buyer / RTO |
| `getTransferRequest`, `getPendingTransferVins` | OwnershipTransferModule | anyone |
| `addServiceRecord`, `getServiceHistory` | ServiceHistoryModule | service centre / anyone |
| `addAccidentRecord`, `addInsurancePolicy`, `getAccidentHistory`, `getInsurancePolicies` | InsuranceModule | insurer / anyone |
| `addLoan`, `clearLoan`, `getLoanHistory`, `hasActiveLoan` | LoanModule | bank / anyone |
| `addPrivateDocument`, `grantDocumentAccess`, `revokeDocumentAccess` | DocumentAccessModule | owner |
| `getPrivateDocuments`, `canViewPrivateDocuments`, `getDocumentAccessExpiry` | DocumentAccessModule | owner, RTO, granted viewer |
| `mint`, `move` | VehicleNFT (via `IVehicleNFT`) | registry only |
| `setRegistry`, `setBaseURI`, `tokenURI`, `vinOf` | VehicleNFT | deployer / anyone |

## Scripts

| Function | File | Used by |
|---|---|---|
| `deployRegistry(ethers, admin)` | scripts/lib/deployRegistry.js | deploy.js, tests |
| `vehicleSpec(overrides)` | scripts/lib/deployRegistry.js | seed.js, tests |
| `writeDeployment`, `readDeployment` | scripts/lib/deployment.js | deploy.js, seed.js |

## Frontend

| Function / component | File | Purpose |
|---|---|---|
| `RegistryService` (all contract reads and writes) | services/registryService.js | Only module that touches the contract |
| `toVehicle`, `toService`, … `toVehicleSpec` | services/mappers.js | One mapper per struct |
| `storage` (`upload`, `fetchBytes`, `openUrl`), `verifyDocument` | services/storage/index.js | Picks Pinata or browser storage |
| `computeCid`, `matchesCid` | services/storage/cid.js | IPFS CID maths, used by upload fallback and hash check |
| `WalletProvider`, `useWallet` | context/WalletContext.jsx | Account, roles, network, service |
| `useAsync` | hooks/useAsync.js | Every data load |
| `useTransaction` | hooks/useTransaction.js | Every transaction (pending / confirmed / error) |
| `useForm` | hooks/useForm.js | Every form's state |
| `useEntityName` | hooks/useEntityName.js | Organisation names |
| `useTransferNotifications` | hooks/useTransferNotifications.js | Incoming-transfer badge and alert |
| `friendlyError` | utils/errors.js | Every error message |
| `buildTimeline` | utils/timeline.js | Verify page and PDF |
| `downloadHistoryReport` | utils/report.js | PDF |
| `shortAddress`, `formatDate`, `formatRupees`, `formatKm`, `dateInputToUnix`, `sameAddress` | utils/format.js | Display formatting |
| `normalizeVin`, `isValidVin`, `normalizeRegNumber` | utils/vin.js | Search and forms |
| `ROLES`, `GRANTABLE_ROLES`, `roleByKey` | constants/roles.js | Navbar, guards, admin |
| `VehicleForm` | components/VehicleForm.jsx | RTO register and dealer create (same form) |
| `VehiclePicker` | components/VehiclePicker.jsx | Service, insurer, bank, RTO stolen flag |
| `RequireWallet`, `RequireRole` | components/ | Page guards (`RequireRole` builds on `RequireWallet`) |
| `Field`, `FileUpload`, `TxStatus`, `AddressLabel`, `DocumentLink`, `StatusBadges`, `VehicleCard`, `Timeline`, `VehicleQRCode`, `VinSearch`, `PrivateDocuments`, `Navbar` | components/ | Shared UI |
