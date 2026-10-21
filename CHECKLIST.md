# Implementation Checklist

Every item from [README.md](README.md), with where it is implemented and how it was checked.
Legend: ✅ done and verified · 🟡 done, needs your keys or your own work to finish · 📝 your part (report / presentation).

"Browser E2E" means the step was driven through the real UI in Chrome against a local Hardhat node
(the README demo script, section 15). "Unit test" refers to [test/VehicleRegistry.test.js](test/VehicleRegistry.test.js) (44 passing).

## 5.1 Must-have

| # | Feature | Status | Where | Verified by |
|---|---|---|---|---|
| 1 | Wallet login with MetaMask | ✅ | [WalletContext.jsx](frontend/src/context/WalletContext.jsx) | Browser E2E |
| 2 | Role-based access control (admin adds/removes RTO, service centres, insurers) | ✅ | [RegistryAccess.sol](contracts/modules/RegistryAccess.sol), [Admin.jsx](frontend/src/pages/Admin.jsx) | Unit tests 1, 2, 16; Browser E2E (grant + revoke) |
| 3 | Vehicle registration by RTO (VIN, reg no, make, model, year, colour, engine no, first owner, document hash) | ✅ | `registerVehicle` in [VehicleCore.sol](contracts/modules/VehicleCore.sol), [Rto.jsx](frontend/src/pages/Rto.jsx) | Unit tests 3–6; Browser E2E |
| 4 | Ownership transfer: owner initiates → buyer accepts → RTO approves, full history kept | ✅ | [OwnershipTransferModule.sol](contracts/modules/OwnershipTransferModule.sol), [MyVehicles.jsx](frontend/src/pages/MyVehicles.jsx), [Rto.jsx](frontend/src/pages/Rto.jsx) | Unit tests 7–11; Browser E2E |
| 5 | Service records by authorised service centres (date, odometer, type, description, cost, invoice on IPFS) | ✅ | [ServiceHistoryModule.sol](contracts/modules/ServiceHistoryModule.sol), [Service.jsx](frontend/src/pages/Service.jsx) | Unit tests 12, 14; Browser E2E |
| 6 | Odometer validation (rejects a lower reading) | ✅ | `_recordOdometer` in [VehicleCore.sol](contracts/modules/VehicleCore.sol) | Unit test 13; Browser E2E (8,000 km after 10,000 km is rejected with a readable message) |
| 7 | Accident / insurance records by insurers | ✅ | [InsuranceModule.sol](contracts/modules/InsuranceModule.sol), [Insurer.jsx](frontend/src/pages/Insurer.jsx) | Unit test 15; Browser E2E |
| 8 | Vehicle history page: search by VIN, timeline of every event with tx hash | ✅ | [Verify.jsx](frontend/src/pages/Verify.jsx), [Timeline.jsx](frontend/src/components/Timeline.jsx), [timeline.js](frontend/src/utils/timeline.js) | Browser E2E (opened with no wallet) |
| 9 | Document upload to IPFS, CID stored on-chain | 🟡 | [services/storage](frontend/src/services/storage/), [FileUpload.jsx](frontend/src/components/FileUpload.jsx) | Browser E2E with the no-key fallback. Real Pinata uploads need `VITE_PINATA_JWT` (see below) |
| 10 | Events emitted for every action | ✅ | Every write function emits an event | Unit tests assert each event and its arguments |

## 5.2 Should-have

| # | Feature | Status | Where | Verified by |
|---|---|---|---|---|
| 11 | QR code that opens the public history page | ✅ | [VehicleQRCode.jsx](frontend/src/components/VehicleQRCode.jsx) | Browser E2E (rendered); scan from a phone, see "Phone / QR" in README §12 |
| 12 | Stolen / blacklist flag; transfers blocked while flagged | ✅ | `setStolenStatus`, `_requireTransferable` | Unit test 10 + "flagged after request"; Browser E2E |
| 13 | Verification badge: who wrote each record, and whether the IPFS file matches the stored hash | ✅ | [Timeline.jsx](frontend/src/components/Timeline.jsx) ("Recorded by" + organisation name), [DocumentLink.jsx](frontend/src/components/DocumentLink.jsx) + [cid.js](frontend/src/services/storage/cid.js) | Browser E2E ("File matches on-chain hash"); CID code checked against known Kubo CIDs |
| 14 | Dashboard per role (RTO, service centre, insurer, owner) | ✅ | [pages/](frontend/src/pages/) + role-filtered [Navbar.jsx](frontend/src/components/Navbar.jsx) | Browser E2E (each role sees only its links) |
| 15 | Downloadable history report (PDF) | ✅ | [report.js](frontend/src/utils/report.js) | Browser E2E (PDF downloaded) |

## 5.3 Nice-to-have

| # | Feature | Status | Where | Verified by |
|---|---|---|---|---|
| 16 | Vehicle as an ERC-721 NFT, token owner = vehicle owner | ✅ | [VehicleNFT.sol](contracts/VehicleNFT.sol). Minted on registration, moved on approved transfer, cannot be moved any other way | Unit tests ("Title NFT") |
| 17 | Time-limited access to private documents for a chosen buyer | ✅ | [DocumentAccessModule.sol](contracts/modules/DocumentAccessModule.sol), [PrivateDocuments.jsx](frontend/src/components/PrivateDocuments.jsx) | Unit tests (expiry, revoke, lapses on sale); Browser E2E (granted viewer sees docs, stranger does not) |
| 18 | Notifications when a transfer request arrives | ✅ | [useTransferNotifications.js](frontend/src/hooks/useTransferNotifications.js) (live event listener + navbar badge) | Browser E2E (badge shows 1) |
| 19 | Loan / hypothecation by a bank that blocks transfer until cleared | ✅ | [LoanModule.sol](contracts/modules/LoanModule.sol), [Bank.jsx](frontend/src/pages/Bank.jsx) | Unit tests; Browser E2E (blocked, then cleared, then transfer works) |

## Roles (README §4)

| Role | Status | Page |
|---|---|---|
| Admin | ✅ | `/admin` |
| Registration Authority (RTO) | ✅ | `/rto` |
| Manufacturer / Dealer (optional) | ✅ `MANUFACTURER_ROLE`: creates the record, RTO assigns the plate | `/dealer` |
| Owner | ✅ | `/my-vehicles` |
| Service Centre | ✅ | `/service` |
| Insurance Company (policies + accidents) | ✅ | `/insurer` |
| Bank (added for the loan feature) | ✅ `BANK_ROLE` | `/bank` |
| Verifier / Buyer / Public (no wallet) | ✅ | `/`, `/vehicle/:vin` |

## Contract design (README §8)

| Item | Status | Notes |
|---|---|---|
| 8.1 Roles | ✅ | Plus `MANUFACTURER_ROLE` and `BANK_ROLE` for the optional features |
| 8.2 Structs | ✅ | Exactly as in the README, plus `InsurancePolicy`, `LoanRecord`, `PrivateDocument`, and `VehicleSpec` (input bundle) in [VehicleTypes.sol](contracts/libraries/VehicleTypes.sol) |
| 8.3 Storage mappings | ✅ | All present, each owned by the module that uses it |
| 8.4 Functions | ✅ | All 15 listed functions, plus the extras listed in [docs/FUNCTIONS.md](docs/FUNCTIONS.md) |
| 8.5 Events | ✅ | All 8 listed events, plus events for the extra features |
| 8.6 Validation rules | ✅ | VIN length 17 and unique, plate unique, owner-only initiate, buyer ≠ owner, no transfer while stolen / pending / under loan, odometer ≥ last, append-only |
| Custom errors with clear messages | ✅ | Mapped to readable text in [errors.js](frontend/src/utils/errors.js) |

## Frontend pages (README §9)

| Page | Route | Status |
|---|---|---|
| Home (intro, connect wallet, VIN search) | `/` | ✅ also lists all registered vehicles |
| Verify Vehicle (details, ownership, services, accidents, stolen badge, QR, documents) | `/vehicle/:vin` | ✅ |
| Admin Panel (grant/revoke, list role holders) | `/admin` | ✅ |
| RTO Dashboard (register, approve pending transfers, mark stolen) | `/rto` | ✅ also assigns plates to dealer-created vehicles |
| Service Centre Dashboard | `/service` | ✅ warns before submitting a lower odometer |
| Insurer Dashboard | `/insurer` | ✅ accidents + policies |
| My Vehicles | `/my-vehicles` | ✅ transfers in and out, private documents and sharing |
| Dealer | `/dealer` | ✅ (extra) |
| Bank | `/bank` | ✅ (extra) |
| Navbar shows only allowed pages, detected with `hasRole` | — | ✅ |
| Loading, pending/confirmed and readable error messages | — | ✅ [useTransaction.js](frontend/src/hooks/useTransaction.js) + [TxStatus.jsx](frontend/src/components/TxStatus.jsx) |

## Implementation plan, setup, testing, deployment (README §11–14)

| Item | Status | Notes |
|---|---|---|
| Hardhat project, OpenZeppelin, Solidity ^0.8.20 | ✅ | Solidity 0.8.28, OpenZeppelin 5.6 |
| `scripts/deploy.js` writes ABI + address to the frontend | ✅ | [deploy.js](scripts/deploy.js) |
| `scripts/seed.js` demo data (roles, vehicles, services, one completed transfer) | ✅ | [seed.js](scripts/seed.js): 3 vehicles, a sale, an active loan, a dealer-created car |
| Unit tests 1–17 from §13 | ✅ | All 17 plus 27 more, 44 passing |
| Coverage (`npx hardhat coverage`) | ✅ | 100% statements, lines and functions |
| Gas report (`REPORT_GAS=true npx hardhat test`) | ✅ | Saved in [docs/gas-report.txt](docs/gas-report.txt) |
| Contract size under the 24 KB mainnet/testnet limit | ✅ | Registry 17.6 KB, NFT 5 KB |
| `.env.example` files, `.env` git-ignored, no secrets committed | ✅ | Root and `frontend/` |
| Sepolia network in `hardhat.config.js` | 🟡 | Activates when `SEPOLIA_RPC_URL` and `PRIVATE_KEY` are in `.env`; not deployed yet |
| Etherscan verification | 🟡 | `npx hardhat verify --network sepolia <NFT address> <admin>` and `<registry address> <admin> <NFT address>`; needs `ETHERSCAN_API_KEY` |
| Frontend hosting (Vercel / Netlify) | 🟡 | `npm run build` works; hosting needs your account |
| Manual testing on Chrome with MetaMask | 🟡 | Flows were driven in Chrome with a test wallet stand-in; try them once with real MetaMask and in Firefox |
| Slither static analysis (optional) | 🟡 | Not run; `pip install slither-analyzer && slither .` |

## Documentation (README §7, §10, §19)

| Item | Status | Where |
|---|---|---|
| Architecture diagram | ✅ | [docs/diagrams/architecture.png](docs/diagrams/architecture.png) |
| Use case diagram | ✅ | [docs/diagrams/use-case.png](docs/diagrams/use-case.png) |
| Sequence diagrams (registration, transfer, service record) | ✅ | [docs/diagrams/](docs/diagrams/) |
| Activity diagram (transfer) | ✅ | [docs/diagrams/activity-transfer.png](docs/diagrams/activity-transfer.png) |
| Class diagram (structs and modules) | ✅ | [docs/diagrams/class-diagram.png](docs/diagrams/class-diagram.png) |
| Data flow diagrams (Level 0 and 1) | ✅ | [docs/diagrams/dfd.png](docs/diagrams/dfd.png) |
| Screenshots of the pages | ✅ | [docs/screenshots/](docs/screenshots/) |
| Design notes, SOLID mapping, test table, gas table | ✅ | [docs/DESIGN.md](docs/DESIGN.md) |
| Function registry (no duplicates) | ✅ | [docs/FUNCTIONS.md](docs/FUNCTIONS.md) |
| Report: title page, abstract, literature survey, feasibility, conclusion, references, team table | 📝 | Your write-up; the docs above supply the diagrams, tables and screenshots |
| Slides, rehearsal, backup demo video | 📝 | Follow README §15 |

## What still needs you

1. **Pinata JWT** (optional): put it in `frontend/.env` as `VITE_PINATA_JWT` for real IPFS uploads that open on any device. Without it, documents are stored in the uploading browser with the same CIDs.
2. **Sepolia** (optional): `SEPOLIA_RPC_URL` (Alchemy or Infura), a test wallet `PRIVATE_KEY` with Sepolia ETH, and optionally `ETHERSCAN_API_KEY`, all in the root `.env`.
3. **Report and presentation** content listed in README §19.
