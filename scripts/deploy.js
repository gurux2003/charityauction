const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  console.log("Deploying MyTestNFT...");
  const MyTestNFT = await hre.ethers.getContractFactory("MyTestNFT");
  const myTestNFT = await MyTestNFT.deploy();
  await myTestNFT.deployed();
  console.log("MyTestNFT deployed to:", myTestNFT.address);

  console.log("Deploying CharityAuction...");
  const CharityAuction = await hre.ethers.getContractFactory("CharityAuction");
  const charityAuction = await CharityAuction.deploy();
  await charityAuction.deployed();
  console.log("CharityAuction deployed to:", charityAuction.address);
}

main().catch((error) => {
  console.error("Error in deployment:", error);
  process.exitCode = 1;
});

