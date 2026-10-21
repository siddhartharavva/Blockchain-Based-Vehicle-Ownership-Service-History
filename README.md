# Blockchain-Based Vehicle Ownership & Service History

A decentralized application (DApp) that records a vehicle's **registration, ownership transfers, maintenance and service history, and accident/insurance events** on a blockchain. Records are tamper-resistant, every change is traceable to who made it, and buyers, insurers and authorities can verify a vehicle's complete history before trusting it.

> **Status:** every feature in section 5 (must-have, should-have and nice-to-have) is implemented and tested.
> See [CHECKLIST.md](CHECKLIST.md) for where each item lives and how it was verified,
> [docs/DESIGN.md](docs/DESIGN.md) for the design, SOLID mapping, test and gas tables, and
> [docs/FUNCTIONS.md](docs/FUNCTIONS.md) for the function registry.

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Objectives](#2-objectives)
3. [Why Blockchain](#3-why-blockchain)
4. [Users and Roles](#4-users-and-roles)
5. [Features](#5-features)
6. [Tech Stack](#6-tech-stack)
7. [System Architecture](#7-system-architecture)
8. [Smart Contract Design](#8-smart-contract-design)
9. [Frontend Pages](#9-frontend-pages)
10. [Project Structure](#10-project-structure)
11. [Step-by-Step Implementation Plan](#11-step-by-step-implementation-plan)
12. [Setup and Running Locally](#12-setup-and-running-locally)
13. [Testing](#13-testing)
14. [Deployment](#14-deployment)
15. [Demo Script (for the presentation)](#15-demo-script-for-the-presentation)
16. [Security Considerations](#16-security-considerations)
17. [Limitations](#17-limitations)
18. [Future Scope](#18-future-scope)
19. [Report / Documentation Checklist](#19-report--documentation-checklist)
20. [References](#20-references)

---

## 1. Problem Statement

When a used vehicle is sold, the buyer usually has to trust paper records or the seller's word about:

- who owned the vehicle before and how many times it changed hands,
- whether the odometer reading is genuine (odometer rollback is a common fraud),
- whether it was in an accident or had major repairs,
- whether servicing was done on time and by authorized centres,
- whether it has a pending loan, theft report or legal issue.

These records are scattered across RTOs, service centres, insurers and the owner's file folder. They can be lost, forged or edited, and there is no single trusted place to verify them.

## 2. Objectives

1. Build a single, shared ledger of each vehicle's life events, identified by its **VIN (Vehicle Identification Number)**.
2. Make records **append-only and tamper-evident**: once written, nothing can be silently changed or deleted.
3. Allow only **authorized parties** (registration authority, verified service centres, insurers) to add records of their type.
4. Make **ownership transfer** a two-step, consent-based process (seller initiates, buyer accepts, authority approves).
5. Let anyone (a buyer, a police officer, an insurer) **verify the full history** of a vehicle using its VIN or a QR code.
6. Detect suspicious data such as an **odometer reading lower than the previous one**.

## 3. Why Blockchain

| Need | How blockchain helps |
|---|---|
| Records must not be altered | Data on-chain is immutable; corrections are new entries, not edits |
| Many organizations, no single owner | A shared ledger that RTO, service centres and insurers all write to |
| Trust who wrote a record | Every transaction is signed by the writer's wallet address |
| Public verifiability | Anyone can read the chain and check the history |
| Audit trail | Every event has a timestamp, block number and transaction hash |

Large files (invoices, RC scans, photos) are **not** stored on-chain because it is expensive. They go to **IPFS**, and only their content hash (CID) is stored on-chain, so any change to the file would change the hash and be detected.

## 4. Users and Roles

| Role | Who | What they can do |
|---|---|---|
| **Admin** | Project deployer / system owner | Grant and revoke roles for authorities, service centres and insurers |
| **Registration Authority (RTO)** | Government transport office | Register new vehicles, approve ownership transfers, flag stolen/blacklisted vehicles |
| **Manufacturer / Dealer** *(optional)* | Car maker or first dealer | Create the initial vehicle record with VIN and specs |
| **Owner** | Vehicle owner (any wallet) | View own vehicles, initiate transfer, accept incoming transfer, share history |
| **Service Centre** | Authorized garage / workshop | Add service and maintenance records with odometer reading and invoice |
| **Insurance Company** | Insurer | Add insurance policies and accident/claim records |
| **Verifier / Buyer / Public** | Anyone | Search by VIN or scan QR code to see the full verified history (read-only) |

Roles are implemented using **OpenZeppelin `AccessControl`**.

## 5. Features

### 5.1 Must-have (core, implement these first)

- [x] **Wallet login** with MetaMask (the wallet address is the user identity).
- [x] **Role-based access control**: admin can add/remove RTO, service centres and insurers.
- [x] **Vehicle registration** by RTO: VIN, registration number, make, model, year, colour, engine number, first owner, document hash.
- [x] **Ownership transfer** in steps: owner initiates → buyer accepts → RTO approves → owner updated. Full ownership history kept.
- [x] **Service records** added by authorized service centres: date, odometer, service type, description, cost, invoice on IPFS.
- [x] **Odometer validation**: the contract rejects a reading lower than the last recorded reading.
- [x] **Accident / insurance records** added by insurers.
- [x] **Vehicle history page**: search by VIN and see a timeline of every event with the transaction hash.
- [x] **Document upload to IPFS** with the CID stored on-chain.
- [x] **Events** emitted for every action, so the frontend can build the timeline.

### 5.2 Should-have (good for marks, do after core works)

- [x] **QR code** for each vehicle that opens its public history page.
- [x] **Stolen / blacklist flag** set by RTO; transfers are blocked while flagged.
- [x] **Verification badge**: shows who wrote each record (RTO, which service centre) and whether the IPFS file matches the stored hash.
- [x] **Dashboard per role** (RTO, service centre, insurer, owner).
- [x] **Downloadable history report** (PDF) for a buyer.

### 5.3 Nice-to-have (only if time allows)

- [x] Vehicle represented as an **NFT (ERC-721)**, where the token owner is the vehicle owner.
- [x] Owner can grant **time-limited access** to private documents to a specific buyer.
- [x] Notifications when a transfer request arrives.
- [x] Loan/hypothecation record by a bank that blocks transfer until cleared.

## 6. Tech Stack

Chosen to be free, well-documented and realistic for a college project.

| Layer | Technology | Why |
|---|---|---|
| Smart contracts | **Solidity ^0.8.20** | Standard language for Ethereum |
| Contract libraries | **OpenZeppelin Contracts** | Audited `AccessControl` (and `ERC721` if using NFTs) |
| Development framework | **Hardhat** | Compile, test, local blockchain, deploy scripts |
| Local blockchain | **Hardhat Network** (`npx hardhat node`) | Free, instant, gives 20 test accounts |
| Public testnet | **Ethereum Sepolia** (or Polygon Amoy) | Free test ETH, shows it works on a real network |
| Frontend | **React + Vite** | Fast, simple setup |
| Blockchain library | **ethers.js v6** | Talk to the contract from the browser |
| Wallet | **MetaMask** browser extension | Signing transactions, user identity |
| File storage | **IPFS via Pinata** (free tier) | Store invoices, RC scans and photos off-chain |
| Styling | **Tailwind CSS** (or plain CSS) | Quick, clean UI |
| QR codes | `qrcode.react` | Generate vehicle QR codes |
| Testing | **Hardhat + Mocha/Chai** | Unit tests for every contract function |
| Version control | **Git + GitHub** | Teamwork and submission |

No traditional database or backend server is required: the blockchain is the database and IPFS is the file store. The React app talks to both directly.

## 7. System Architecture

```
          ┌───────────────────────────────────────────────┐
          │                React Frontend                 │
          │  (RTO / Service Centre / Insurer / Owner /    │
          │   Public Verify pages)                        │
          └───────┬───────────────────────────┬───────────┘
                  │ ethers.js + MetaMask      │ HTTP (Pinata API)
                  ▼                           ▼
     ┌─────────────────────────┐     ┌──────────────────────┐
     │  Ethereum (Hardhat /    │     │        IPFS          │
     │  Sepolia testnet)       │     │ invoices, RC scans,  │
     │                         │     │ photos (by CID)      │
     │  VehicleRegistry.sol    │     └──────────────────────┘
     │  - roles                │               ▲
     │  - vehicles             │               │ CID stored on-chain
     │  - ownership history    │───────────────┘
     │  - service records      │
     │  - accident records     │
     │  - events               │
     └─────────────────────────┘
```

### Main flows

**Registration**
1. RTO opens "Register Vehicle", fills details, uploads the RC document.
2. Frontend uploads the file to IPFS and gets a CID.
3. Frontend calls `registerVehicle(...)` with details and CID; MetaMask asks RTO to sign.
4. Contract stores the vehicle and emits `VehicleRegistered`.

**Ownership transfer**
1. Owner calls `initiateTransfer(vin, buyerAddress)`.
2. Buyer calls `acceptTransfer(vin)`.
3. RTO calls `approveTransfer(vin)`. The contract updates the owner, appends to ownership history and emits `OwnershipTransferred`.
4. Either party can cancel before approval.

**Service record**
1. Service centre uploads invoice to IPFS.
2. Calls `addServiceRecord(vin, odometer, serviceType, description, cost, cid)`.
3. Contract checks the caller has `SERVICE_CENTER_ROLE` and that `odometer >= lastOdometer`.

**Verification**
1. Anyone enters a VIN or scans the QR code.
2. Frontend reads vehicle details, ownership history, service and accident records (read calls are free, no wallet needed).
3. Timeline is shown with who wrote each record, the date and a link to the transaction and document.

## 8. Smart Contract Design

A single contract, `VehicleRegistry.sol`, is enough for this project and keeps it easy to explain. (You can split it into several contracts later if your guide asks for it.)

### 8.1 Roles

```solidity
bytes32 public constant RTO_ROLE            = keccak256("RTO_ROLE");
bytes32 public constant SERVICE_CENTER_ROLE = keccak256("SERVICE_CENTER_ROLE");
bytes32 public constant INSURER_ROLE        = keccak256("INSURER_ROLE");
// DEFAULT_ADMIN_ROLE from OpenZeppelin is the admin
```

### 8.2 Data structures

```solidity
struct Vehicle {
    string  vin;
    string  registrationNumber;
    string  make;
    string  model;
    uint16  year;
    string  color;
    string  engineNumber;
    address currentOwner;
    uint256 lastOdometer;
    string  documentCID;     // RC / registration document on IPFS
    bool    isStolen;
    bool    exists;
    uint256 registeredAt;
}

struct OwnershipRecord {
    address owner;
    uint256 fromTimestamp;
    uint256 toTimestamp;     // 0 while current owner
}

struct ServiceRecord {
    uint256 timestamp;
    uint256 odometer;
    string  serviceType;     // "General Service", "Oil Change", "Repair", ...
    string  description;
    uint256 cost;            // in rupees (whole number)
    string  invoiceCID;
    address serviceCenter;
}

struct AccidentRecord {
    uint256 timestamp;
    string  description;
    string  severity;        // "Minor", "Major", "Total Loss"
    uint256 claimAmount;
    string  reportCID;
    address insurer;
}

struct TransferRequest {
    address from;
    address to;
    bool    buyerAccepted;
    bool    active;
}
```

### 8.3 Storage

```solidity
mapping(string => Vehicle)            private vehicles;          // VIN -> vehicle
mapping(string => OwnershipRecord[])  private ownershipHistory;  // VIN -> owners
mapping(string => ServiceRecord[])    private serviceHistory;    // VIN -> services
mapping(string => AccidentRecord[])   private accidentHistory;   // VIN -> accidents
mapping(string => TransferRequest)    private transferRequests;  // VIN -> pending transfer
mapping(address => string[])          private ownerVehicles;     // owner -> VINs
mapping(string => string)             private regNumberToVin;    // reg no -> VIN
string[] private allVins;
```

### 8.4 Functions

| Function | Who can call | Description |
|---|---|---|
| `grantRole(role, account)` | Admin | Inherited from AccessControl |
| `registerVehicle(vin, regNo, make, model, year, color, engineNo, owner, docCID)` | RTO | Creates a vehicle; VIN must be unique |
| `initiateTransfer(vin, to)` | Current owner | Creates a pending transfer; blocked if stolen |
| `acceptTransfer(vin)` | Buyer (`to`) | Buyer consents |
| `approveTransfer(vin)` | RTO | Completes the transfer after buyer accepted |
| `cancelTransfer(vin)` | Owner or buyer | Cancels a pending transfer |
| `addServiceRecord(vin, odometer, type, desc, cost, cid)` | Service centre | Rejects odometer lower than last |
| `addAccidentRecord(vin, desc, severity, amount, cid)` | Insurer | Adds accident/claim |
| `setStolenStatus(vin, bool)` | RTO | Flags or clears stolen status |
| `getVehicle(vin)` | Anyone | Returns vehicle details |
| `getOwnershipHistory(vin)` | Anyone | Returns all owners |
| `getServiceHistory(vin)` | Anyone | Returns all service records |
| `getAccidentHistory(vin)` | Anyone | Returns all accident records |
| `getVehiclesByOwner(address)` | Anyone | Returns VINs owned |
| `getVinByRegNumber(regNo)` | Anyone | Lookup by number plate |

### 8.5 Events

```solidity
event VehicleRegistered(string indexed vin, address indexed owner, address indexed rto);
event TransferInitiated(string indexed vin, address indexed from, address indexed to);
event TransferAccepted(string indexed vin, address indexed to);
event OwnershipTransferred(string indexed vin, address indexed from, address indexed to);
event TransferCancelled(string indexed vin);
event ServiceRecordAdded(string indexed vin, address indexed serviceCenter, uint256 odometer);
event AccidentRecordAdded(string indexed vin, address indexed insurer, string severity);
event StolenStatusChanged(string indexed vin, bool isStolen);
```

### 8.6 Key validation rules

- VIN must be 17 characters and not already registered.
- Only the current owner can initiate a transfer; buyer cannot be the same as the owner.
- No transfer while the vehicle is flagged stolen or another transfer is pending.
- Odometer must be `>=` last recorded value (anti-rollback).
- Records are never deleted or edited. A mistake is fixed by adding a new correcting record.

## 9. Frontend Pages

| Page | Route | Who | Contents |
|---|---|---|---|
| Home | `/` | Everyone | Project intro, "Connect Wallet", VIN search box |
| Verify Vehicle | `/vehicle/:vin` | Everyone | Vehicle details, ownership timeline, service history, accidents, stolen badge, QR code, document links |
| Admin Panel | `/admin` | Admin | Grant/revoke RTO, service centre, insurer roles; list role holders |
| RTO Dashboard | `/rto` | RTO | Register vehicle form, pending transfers to approve, mark stolen |
| Service Centre Dashboard | `/service` | Service centre | Search VIN, add service record with invoice upload |
| Insurer Dashboard | `/insurer` | Insurer | Add accident/claim record |
| My Vehicles | `/my-vehicles` | Owner | Owned vehicles, start transfer, incoming transfer requests to accept |

The navbar shows only the pages the connected wallet's role allows. The frontend detects the role with `hasRole(role, address)`.

## 10. Project Structure

```
.
├── contracts/
│   ├── VehicleRegistry.sol            # composes the modules below (one address, one ABI)
│   ├── VehicleNFT.sol                 # ERC-721 title token, movable only by the registry
│   ├── interfaces/IVehicleNFT.sol
│   ├── libraries/VehicleTypes.sol     # every struct, defined once
│   └── modules/
│       ├── RegistryAccess.sol         # roles (AccessControlEnumerable) + organisation names
│       ├── VehicleCore.sol            # vehicles, ownership history, odometer, stolen flag
│       ├── OwnershipTransferModule.sol
│       ├── ServiceHistoryModule.sol
│       ├── InsuranceModule.sol        # accidents + insurance policies
│       ├── LoanModule.sol             # hypothecation, blocks transfers
│       └── DocumentAccessModule.sol   # private docs with time-limited access
├── scripts/
│   ├── deploy.js                      # deploys and writes address + ABI to frontend
│   ├── seed.js                        # demo data: roles, vehicles, services, transfer, loan
│   └── lib/                           # shared deploy + deployment-file helpers
├── test/VehicleRegistry.test.js       # 44 tests
├── hardhat.config.js
├── .env.example                       # SEPOLIA_RPC_URL, PRIVATE_KEY, ETHERSCAN_API_KEY
├── frontend/
│   ├── .env.example                   # VITE_PINATA_JWT, VITE_RPC_URL, VITE_CHAIN_ID
│   └── src/
│       ├── contracts/                 # ABIs + address.json (written by deploy.js)
│       ├── config/                    # env + deployment lookup
│       ├── constants/                 # roles, form options
│       ├── context/WalletContext.jsx  # account, roles, network, service
│       ├── services/
│       │   ├── registryService.js     # the only code that calls the contract
│       │   ├── mappers.js
│       │   └── storage/               # Pinata, browser fallback, CID maths
│       ├── hooks/                     # useAsync, useTransaction, useForm, notifications
│       ├── utils/                     # format, vin, errors, timeline, PDF report
│       ├── components/                # Navbar, Timeline, VehicleCard, FileUpload, QR, ...
│       └── pages/                     # Home, Verify, Admin, Rto, Dealer, Service, Insurer, Bank, MyVehicles
├── docs/
│   ├── DESIGN.md  FUNCTIONS.md  gas-report.txt
│   ├── diagrams/                      # architecture, use case, class, sequences, activity, DFD (.mmd + .png)
│   └── screenshots/
├── CHECKLIST.md
└── README.md
```

## 11. Step-by-Step Implementation Plan

Suggested timeline for a team of 2 to 4 over about 8 weeks. Adjust to your deadline.

### Phase 0: Preparation (Week 1)

1. Install **Node.js LTS (v20+)**, **Git**, **VS Code** (with the Solidity extension) and **MetaMask**.
2. Learn the basics: what a block, transaction, wallet, gas and smart contract are. Do one Solidity tutorial (e.g. CryptoZombies or the Solidity docs "Introduction to Smart Contracts").
3. Create a GitHub repository and add all team members.
4. Split work: one or two people on contracts and tests, one or two on the frontend, one on documentation and diagrams (everyone helps with testing).
5. Draw the **use case diagram**, **architecture diagram** and **sequence diagram for transfer** (draw.io is fine). These go in the report.

### Phase 1: Project setup (Week 1)

```bash
mkdir vehicle-blockchain && cd vehicle-blockchain
npm init -y
npm install --save-dev hardhat @nomicfoundation/hardhat-toolbox dotenv
npm install @openzeppelin/contracts
npx hardhat init        # choose "Create a JavaScript project"
```

Delete the sample `Lock.sol` contract and its test.

### Phase 2: Smart contract (Weeks 2 to 3)

1. Create `contracts/VehicleRegistry.sol`, inherit `AccessControl`, define roles and grant `DEFAULT_ADMIN_ROLE` to the deployer in the constructor.
2. Add the structs and mappings from section 8.
3. Implement `registerVehicle` and `getVehicle`. Compile with `npx hardhat compile`.
4. Implement the transfer flow: `initiateTransfer`, `acceptTransfer`, `approveTransfer`, `cancelTransfer`, keeping `ownershipHistory` and `ownerVehicles` in sync.
5. Implement `addServiceRecord` with the odometer check, and `addAccidentRecord`.
6. Implement `setStolenStatus` and block transfers when stolen.
7. Add all getters and events.
8. Use `require(condition, "clear message")` or custom errors everywhere so the frontend can show useful errors.

### Phase 3: Tests (Week 3, alongside Phase 2)

Write `test/VehicleRegistry.test.js` covering at least the cases in [section 13](#13-testing). Run with `npx hardhat test`. Aim for every function to have a success test and a failure test.

### Phase 4: Deploy locally and seed data (Week 4)

1. Write `scripts/deploy.js` that deploys the contract and copies the ABI and address into `frontend/src/contracts/`.
2. Write `scripts/seed.js` that grants roles to test accounts 1 to 3 and creates 2 or 3 demo vehicles with service history and one completed transfer.
3. Run:
   ```bash
   npx hardhat node                                       # terminal 1, keep running
   npx hardhat run scripts/deploy.js --network localhost  # terminal 2
   npx hardhat run scripts/seed.js   --network localhost
   ```
4. In MetaMask add the network **Hardhat Local** (RPC `http://127.0.0.1:8545`, Chain ID `31337`) and import 4 or 5 of the printed test private keys (Admin, RTO, Service Centre, Insurer, Owner A, Owner B).

### Phase 5: Frontend (Weeks 4 to 6)

1. Create the app:
   ```bash
   npm create vite@latest frontend -- --template react
   cd frontend
   npm install ethers react-router-dom qrcode.react
   npm install -D tailwindcss @tailwindcss/vite   # optional
   ```
2. Build `WalletContext`: connect MetaMask (`new ethers.BrowserProvider(window.ethereum)`), get the signer and address, create the contract instance, detect the role with `hasRole`, and listen for `accountsChanged` and `chainChanged`.
3. Build the **Verify Vehicle** page first. It only reads data, so it is the easiest and the most important for the demo.
4. Build the **RTO dashboard** (register form + pending transfers + stolen flag).
5. Add `utils/ipfs.js` to upload files to Pinata and return the CID. Use it in every form that takes a document.
6. Build **Service Centre** and **Insurer** dashboards.
7. Build **My Vehicles** with transfer initiate/accept.
8. Build **Admin panel** for granting roles.
9. Add the **timeline component**: merge ownership, service and accident records, sort by time, show icons, writer address and a link to the document.
10. Add **QR code** on the vehicle page linking to `/vehicle/:vin`.
11. Handle loading states, transaction pending/confirmed messages and errors (e.g. "Odometer cannot be lower than previous reading").

### Phase 6: Testnet deployment (Week 7)

1. Get a free RPC URL from **Alchemy** or **Infura** for Sepolia and free Sepolia ETH from a faucet.
2. Add the `sepolia` network in `hardhat.config.js` using values from `.env`.
3. Deploy: `npx hardhat run scripts/deploy.js --network sepolia`.
4. Optionally verify the contracts on Etherscan so the code is publicly visible: `npx hardhat verify --network sepolia <VehicleNFT address> <admin address>` and `npx hardhat verify --network sepolia <VehicleRegistry address> <admin address> <VehicleNFT address>` (addresses are printed by the deploy script and saved in `frontend/src/contracts/address.json`). Then build the frontend with `VITE_CHAIN_ID=11155111` and a Sepolia `VITE_RPC_URL`.
5. Optionally host the frontend on **Vercel** or **Netlify**.

### Phase 7: Polish, report and presentation (Week 8)

1. Take screenshots of every page and every flow.
2. Write the report (see [section 19](#19-report--documentation-checklist)).
3. Prepare slides and rehearse the demo script in [section 15](#15-demo-script-for-the-presentation).
4. Record a backup demo video in case the live demo fails.

## 12. Setup and Running Locally

### Prerequisites

- Node.js 20 or later and npm
- Git
- MetaMask browser extension
- A free Pinata account (for an API JWT) if you want document uploads

### Steps

```bash
# 1. Clone
git clone <your-repo-url>
cd vehicle-blockchain

# 2. Install contract dependencies
npm install

# 3. Compile and test
npx hardhat compile
npx hardhat test

# 4. Start a local blockchain (keep this terminal open)
npx hardhat node

# 5. In a new terminal: deploy and seed demo data
npx hardhat run scripts/deploy.js --network localhost
npx hardhat run scripts/seed.js   --network localhost

# 6. Start the frontend
cd frontend
cp .env.example .env      # optional: put your VITE_PINATA_JWT here
npm install
npm run dev               # open http://localhost:5173
```

Then in MetaMask switch to **Hardhat Local** (`http://127.0.0.1:8545`, chain ID `31337`; the app offers to add it) and import the test accounts. `npx hardhat node` prints their private keys; these are public Hardhat test keys, never use them on a real network. The seed script uses them as:

| Account | Role | Seeded name |
|---|---|---|
| #0 | Admin | |
| #1 | RTO | Hyderabad RTO |
| #2 | Service centre | Speedy Motors Service |
| #3 | Insurer | SafeDrive Insurance |
| #4 | Bank | City Bank Auto Loans |
| #5 | Manufacturer / dealer | Maruti Dealer Hyderabad |
| #6 | Owner A | |
| #7 | Owner B | |

**Without a Pinata key** everything still works: uploaded documents get a real IPFS CID and are kept in the uploading browser, so the on-chain CID and the "verify hash" check behave the same. Add `VITE_PINATA_JWT` to make documents open on any device.

**Phone / QR demo:** start the node with `npx hardhat node --hostname 0.0.0.0`, set `VITE_RPC_URL=http://<your-laptop-LAN-IP>:8545` in `frontend/.env`, restart `npm run dev`, and scan the QR code on a vehicle page with a phone on the same Wi-Fi.

> If MetaMask shows a "nonce too high" error after restarting `hardhat node`, go to MetaMask → Settings → Advanced → **Clear activity tab data**.

### Environment variables

`.env` (root, for deployment to testnet only):
```
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/<key>
PRIVATE_KEY=<test wallet private key, never a real one>
ETHERSCAN_API_KEY=<optional>
```

`frontend/.env`:
```
VITE_PINATA_JWT=<pinata jwt>
VITE_PINATA_GATEWAY=https://gateway.pinata.cloud/ipfs/
```

Add both `.env` files to `.gitignore`.

## 13. Testing

### Unit tests (Hardhat)

| # | Test case | Expected |
|---|---|---|
| 1 | Deployer has admin role | Pass |
| 2 | Admin grants RTO role | RTO can register |
| 3 | Non-RTO tries to register a vehicle | Reverts |
| 4 | Register vehicle with valid data | Stored, event emitted, owner history has 1 entry |
| 5 | Register duplicate VIN | Reverts |
| 6 | Register with VIN not 17 chars | Reverts |
| 7 | Non-owner initiates transfer | Reverts |
| 8 | Full transfer: initiate → accept → approve | Owner changed, history has 2 entries |
| 9 | RTO approves before buyer accepts | Reverts |
| 10 | Transfer while vehicle is stolen | Reverts |
| 11 | Cancel pending transfer | Request cleared |
| 12 | Service centre adds record | Stored, lastOdometer updated |
| 13 | Service record with lower odometer | Reverts (rollback detected) |
| 14 | Non-service-centre adds service record | Reverts |
| 15 | Insurer adds accident record | Stored |
| 16 | Revoked service centre adds record | Reverts |
| 17 | Read functions work without a wallet | Returns data |

Check coverage with `npx hardhat coverage`.

### Manual / UI testing

- Connect each role's account and confirm only the right pages appear.
- Try each failure case from the UI and confirm a readable error is shown.
- Confirm uploaded documents open from IPFS and match.
- Test on Chrome and Firefox with MetaMask.

## 14. Deployment

| Target | Command / Service |
|---|---|
| Local | `npx hardhat node` + `scripts/deploy.js --network localhost` |
| Testnet | `scripts/deploy.js --network sepolia` (needs RPC URL + funded test wallet) |
| Frontend hosting | `npm run build` in `frontend/` and deploy `dist/` to Vercel or Netlify |
| Contract source | Verify on Sepolia Etherscan with `npx hardhat verify` |

For the college demo, **local Hardhat is the most reliable**; show Sepolia as proof it runs on a public network.

## 15. Demo Script (for the presentation)

Practise this end to end; it shows every feature in about 10 minutes.

1. **Admin** grants roles to the RTO, a service centre and an insurer.
2. **RTO** registers a new car (VIN + details + RC document upload). Show the transaction in MetaMask and the event.
3. **Service centre** adds two services at 5,000 km and 10,000 km with invoices.
4. **Service centre** tries to add a service at 8,000 km → the transaction is **rejected** (odometer rollback prevented). This is a strong moment in the demo.
5. **Insurer** adds a minor accident record.
6. **Owner A** initiates a transfer to **Owner B**; **Owner B** accepts; **RTO** approves.
7. Open the **Verify page** without connecting a wallet, search by VIN or scan the QR code with a phone, and show the full timeline: 2 owners, 2 services, 1 accident, each with who recorded it.
8. **RTO** marks the vehicle stolen; Owner B tries to transfer → **blocked**.
9. Explain that none of these records can be edited or deleted, even by the admin.

## 16. Security Considerations

- **Access control** on every write function via OpenZeppelin `AccessControl`; only admin manages roles.
- **Input validation** with `require` on every function (VIN length, non-zero addresses, no duplicates).
- **Append-only design**: no update or delete functions for history records.
- **Two-party consent** plus authority approval for transfers prevents someone transferring a vehicle without the buyer agreeing.
- **No personal data on-chain**: store wallet addresses, not names, phone numbers or Aadhaar. Personal data on a public chain cannot be erased. Sensitive documents should be encrypted before uploading to IPFS, or kept to non-sensitive files for the demo.
- **Private keys** only in `.env`, never committed. Use test wallets only.
- Solidity 0.8+ has built-in overflow checks; avoid unbounded loops in write functions.
- Optionally run **Slither** (static analyzer) on the contract and mention the results in the report.

## 17. Limitations

- **Garbage in, garbage out**: blockchain proves a record was not changed after it was written, not that it was true when written. That is why only authorized parties can write.
- Public chains have **gas costs**; a real deployment would likely use a permissioned chain (Hyperledger Fabric, Polygon PoS / a private EVM chain).
- Depends on real RTOs, service centres and insurers adopting it.
- IPFS files must be **pinned** (Pinata) or they may disappear.
- Personal data and privacy laws (e.g. India's DPDP Act 2023) limit what can go on-chain.

## 18. Future Scope

- Vehicles as **ERC-721 NFTs** so ownership works with standard wallets.
- **IoT / OBD-II** device integration to log odometer readings automatically.
- Integration with government systems such as **VAHAN / Parivahan**.
- **Permissioned blockchain** (Hyperledger Fabric) for production use.
- **Zero-knowledge proofs** to prove "no accidents" without revealing all details.
- Mobile app with QR scanning for traffic police.
- Loan / hypothecation tracking by banks.
- Pollution certificate (PUC) and fitness certificate records.

## 19. Report / Documentation Checklist

Typical college project report sections:

- [ ] Title page, certificate, acknowledgement
- [ ] Abstract (150 to 250 words)
- [ ] Introduction and problem statement
- [ ] Objectives and scope
- [ ] Literature survey (5 to 10 papers or articles on blockchain vehicle registries)
- [ ] Existing system vs proposed system (comparison table)
- [ ] Requirements: functional, non-functional, hardware, software
- [ ] Feasibility study (technical, economic, operational)
- [ ] System architecture diagram
- [ ] UML: use case, class diagram (structs), sequence diagrams (registration, transfer, service record), activity diagram
- [ ] Data flow diagrams (Level 0 and Level 1)
- [ ] Smart contract design (structs, functions, events, roles)
- [ ] Module description (Admin, RTO, Service Centre, Insurer, Owner, Verifier)
- [ ] Implementation with key code snippets
- [ ] Testing: test case table with results and coverage
- [ ] Screenshots of every page
- [ ] Gas cost table for each function (Hardhat gas reporter: `REPORT_GAS=true npx hardhat test`)
- [ ] Results and discussion
- [ ] Limitations and future scope
- [ ] Conclusion
- [ ] References

## 20. References

- Solidity documentation: https://docs.soliditylang.org
- Hardhat documentation: https://hardhat.org/docs
- OpenZeppelin Contracts (AccessControl): https://docs.openzeppelin.com/contracts
- ethers.js v6 documentation: https://docs.ethers.org/v6/
- MetaMask developer docs: https://docs.metamask.io
- IPFS documentation: https://docs.ipfs.tech
- Pinata documentation: https://docs.pinata.cloud
- Ethereum Sepolia testnet: https://ethereum.org/en/developers/docs/networks/
- Search Google Scholar / IEEE Xplore for "blockchain vehicle registration", "blockchain odometer fraud", "blockchain vehicle lifecycle" for the literature survey.

---

### Team

| Name | Roll No. | Responsibility |
|---|---|---|
| | | Smart contracts and tests |
| | | Frontend |
| | | IPFS integration and deployment |
| | | Documentation, diagrams, report |

**Guide:** _(teacher's name)_
