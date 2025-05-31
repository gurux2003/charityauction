const { ethers } = require("hardhat");

async function main() {
  const [deployer, bidder, charity] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);
  console.log("Bidder:", bidder.address);
  console.log("Charity:", charity.address);

  const NFT = await ethers.getContractFactory("MyTestNFT");
  const nft = await NFT.deploy();
  await nft.deployed();                    
  const nftAddress = nft.address;          
  console.log("✅ NFT Contract deployed at:", nftAddress);

  const txMint = await nft.mint();
  await txMint.wait();
  console.log("✅ Minted NFT to:", deployer.address);

  const tokenId = 0;

  const tokenUri = await nft.tokenURI(tokenId);
  console.log("TokenURI (base64):", tokenUri);

  const base64JSON = tokenUri.split(",")[1];
  const jsonMetadata = Buffer.from(base64JSON, "base64").toString("utf-8");
  console.log("Decoded JSON metadata:", jsonMetadata);

  const metadata = JSON.parse(jsonMetadata);
  console.log("NFT Name:", metadata.name);
  console.log("NFT Description:", metadata.description);

  const Auction = await ethers.getContractFactory("CharityAuction");
  const auction = await Auction.deploy();
  await auction.deployed();                 
  const auctionAddress = auction.address;  
  console.log("✅ Auction Contract deployed at:", auctionAddress);

  const txApprove = await nft.approve(auctionAddress, tokenId);
  await txApprove.wait();
  console.log("✅ Approved Auction contract to transfer NFT");

  const startPrice = ethers.utils.parseEther("0.01");  
  const duration = 60 * 5; 

  const txCreateAuction = await auction.createAuction(
    nftAddress,
    tokenId,
    startPrice,
    duration,
    charity.address
  );
  await txCreateAuction.wait();
  console.log("✅ Auction created");

  const auctionId = 1;
  const bidAmount = ethers.utils.parseEther("0.02"); 
  const auctionAsBidder = auction.connect(bidder);
  const txBid = await auctionAsBidder.placeBid(auctionId, { value: bidAmount });
  await txBid.wait();
  console.log("✅ Bid placed by:", bidder.address);

  console.log("🎯 NFT Contract Address:", nftAddress);
  console.log("🎯 Auction Contract Address:", auctionAddress);
}

main().catch((error) => {
  console.error("❌ Error in script:", error);
  process.exit(1);
});
