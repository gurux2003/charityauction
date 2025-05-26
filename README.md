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
- **Secure Bidding**: Outbid users are eligible for refunds via a secure withdrawal function.
- **Time-Bound Auctions**: Auctions are created with a fixed duration in minutes.
- **Reentrancy Protection**: All sensitive operations involving ETH transfers are protected against reentrancy attacks.

---

## How It Works

1. **Auction Creation**: The seller specifies the NFT address, token ID, charity wallet address, auction duration, and minimum bid.
2. **NFT Escrow**: The NFT is transferred to the contract for the duration of the auction.
3. **Bidding Process**: Bidders place bids in ETH, each exceeding the previous highest bid.
4. **Refunds**: Previous highest bidders can withdraw their bids safely via a `withdraw()` function.
5. **Auction End**: When the auction ends, the NFT is transferred to the highest bidder and the ETH is transferred to the charity.
6. **No Bids?** The NFT is returned to the seller if there are no bids.

---

## Smart Contract Overview

```solidity
struct Auction {
    address nftAddress;
    uint256 tokenId;
    address payable charity;
    address payable seller;
    uint256 endTime;
    uint256 highestBid;
    address payable highestBidder;
    bool ended;
}
