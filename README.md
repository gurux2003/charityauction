# CharityAuction Smart Contract

CharityAuction is a decentralized smart contract platform that allows users to create time-bound auctions for ERC-721 NFTs (non-fungible tokens), with the unique feature of donating all proceeds from the winning bid directly to a designated charity wallet. This contract prioritizes transparency, trust, and social impact through blockchain technology.

---

## Table of Contents

- [Features](#features)
- [How It Works](#how-it-works)
- [Smart Contract Overview](#smart-contract-overview)
- [Functions](#functions)
- [Events](#events)
- [Usage Example](#usage-example)
- [Deployment](#deployment)
- [Security Considerations](#security-considerations)
- [License](#license)
- [Contact](#contact)

---

## Features

- **NFT Auctioning**: Users can auction any ERC-721 NFT by transferring it to the contract.
- **Charity Donations**: The winning bid is automatically transferred to a specified charity wallet.
- **Manual Withdrawals**: Previous bidders can safely withdraw their overbid funds using a reentrancy-safe pattern.
- **No Bid Refund**: If no bids are placed, the NFT is returned to the original seller.

---

## How It Works

1. Seller creates an auction with:
   - NFT address
   - Token ID
   - Charity wallet
   - Duration (in minutes)
   - Minimum bid amount
2. Bidders place bids, each bid must be higher than the current highest.
3. At the end of the auction:
   - If there is a highest bidder, NFT is transferred to them, and funds go to charity.
   - If no bids, NFT is returned to seller.
4. Previous bidders can withdraw their refunds manually.

---

## Smart Contract Overview

- **Contract Name**: `CharityAuction`
- **Language**: Solidity ^0.8.24
- **Interface Used**: `IERC721` for interacting with NFTs.
- **Reentrancy Protection**: `noReentrant` modifier is used for secure withdrawals.

---

## Functions

- `createAuction(address, uint256, address payable, uint256, uint256)`: Create a new NFT auction.
- `placeBid(uint256)`: Place a bid on an active auction.
- `withdraw()`: Withdraw overbid amount if outbid.
- `endAuction(uint256)`: End the auction and transfer NFT and funds.
- `getAuctionDetails(uint256)`: View auction details.

---

## Events

- `AuctionCreated(uint256, address, uint256, address, address, uint256)`
- `BidPlaced(uint256, address, uint256)`
- `AuctionEnded(uint256, address, uint256, address)`

---

## Usage Example

```solidity
// Deploy contract
// Seller must approve this contract to transfer their NFT

charityAuction.createAuction(
    nftAddress,
    tokenId,
    charityWallet,
    60,         // 60 minutes
    1 ether     // Starting bid
);

// Bidders can call:
charityAuction.placeBid{value: 2 ether}(auctionId);

// Outbid users can call:
charityAuction.withdraw();

// Anyone can end auction after time:
charityAuction.endAuction(auctionId);
```

## Deployment

To deploy the `CharityAuction` contract, follow these steps:

### Prerequisites

- Node.js and npm installed
- Hardhat or Truffle development environment
- A wallet (e.g., MetaMask) with ETH for gas fees
- NFT (ERC-721) already minted and approved for the contract to transfer

### Deployment Steps (Hardhat Example)

1. **Install dependencies** (if using Hardhat):

```bash
npm init -y
npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
```
## Security Considerations

The `CharityAuction` contract implements several important security practices to protect users and funds:

### 1. Reentrancy Protection
- Critical functions like `placeBid`, `withdraw`, and `endAuction` are protected using the `noReentrant` modifier.
- A `locked` state variable ensures no nested (reentrant) calls are made during execution.

### 2. Manual Withdraw Pattern
- Instead of sending ETH directly during a new bid (which is vulnerable to fallback function abuse), refunds are stored in a `pendingReturns` mapping.
- Users must manually call `withdraw()` to claim refunds, following the *checks-effects-interactions* pattern.

### 3. Ownership-Free and Decentralized
- There are no `owner` or `admin` roles in the contract.
- All auction management is handled transparently by users interacting with public functions.

### 4. Time-Bound Auction Finality
- The auction logic enforces a strict `endTime`, preventing further bids after expiration.
- Only one final action (`endAuction`) is allowed to distribute funds and transfer the NFT, making it deterministic.

### 5. Safe External Calls
- ETH transfers use `.call{value: amount}("")` instead of `transfer()` or `send()` to avoid fixed gas stipend issues.

### 6. Validation Checks
- Functions like `createAuction`, `placeBid`, and `withdraw` include input and state validations (e.g., `require` statements).

### 7. NFT Transfer Control
- The contract assumes the user has approved the contract to transfer their NFT before creating an auction.
- Ensures the NFT is securely locked in the contract during the auction period.

---

These considerations enhance the trustworthiness and safety of the CharityAuction platform for all participants. Formal audits and community reviews are still recommended before mainnet deployment.

