// Import Hardhat runtime environment explicitly
const hre = require("hardhat");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  console.log("Deploying MyTestNFT...");
  const MyTestNFT = await hre.ethers.getContractFactory("MyTestNFT");
  const myTestNFT = await MyTestNFT.deploy();
  await myTestNFT.waitForDeployment();
  console.log("MyTestNFT deployed at:", myTestNFT.target);

  console.log("Deploying CharityAuction...");
  const CharityAuction = await hre.ethers.getContractFactory("CharityAuction");
  const charityAuction = await CharityAuction.deploy();
  await charityAuction.waitForDeployment();
  console.log("CharityAuction deployed at:", charityAuction.target);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in deployment:", error);
    process.exit(1);
  });
