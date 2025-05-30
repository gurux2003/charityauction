const { ethers } = require("hardhat");

async function main() {
  const [deployer, bidder, charity] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Bidder:", bidder.address);
  console.log("Charity:", charity.address);

  //Deploy MyTestNF
  const NFT = await ethers.getContractFactory("MyTestNFT");
  const nft = await NFT.deploy();
  await nft.waitForDeployment();
  const nftAddress = await nft.getAddress();
  console.log("✅ NFT Contract deployed at:", nftAddress);

  //Mint an NFT to the deployer
  const txMint = await nft.mint();
  await txMint.wait();
  console.log("✅ Minted NFT to:", deployer.address);

  const tokenId = 0;

  //Deploy CharityAuction
  const Auction = await ethers.getContractFactory("CharityAuction");
  const auction = await Auction.deploy();
  await auction.waitForDeployment();
  const auctionAddress = await auction.getAddress();
  console.log("✅ Auction Contract deployed at:", auctionAddress);

  //Approve the auction contract to transfer the NFT
  const txApprove = await nft.approve(auctionAddress, tokenId);
  await txApprove.wait();
  console.log("✅ Approved Auction contract to transfer NFT");

  //Create an auction
  const startPrice = ethers.parseEther("0.01");
  const duration = 60 * 5; // 5 minutes

  const txCreateAuction = await auction.createAuction(
    nftAddress,
    tokenId,
    startPrice,
    duration,
    charity.address
  );
  await txCreateAuction.wait();
  console.log("✅ Auction created");

  //Place a bid from the bidder account
  const auctionId = 1;
  const bidAmount = ethers.parseEther("0.02");
  const auctionAsBidder = auction.connect(bidder);
  const txBid = await auctionAsBidder.placeBid(auctionId, { value: bidAmount });
  await txBid.wait();
  console.log("✅ Bid placed by:", bidder.address);

  //Summary
  console.log("🎯 NFT Contract Address:", nftAddress);
  console.log("🎯 Auction Contract Address:", auctionAddress);
}

main().catch((error) => {
  console.error("❌ Error in script:", error);
  process.exit(1);
});
