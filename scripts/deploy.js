const hre = require("hardhat");

async function main() {
  // Get the contract factory for CharityAuction
  const CharityAuction = await hre.ethers.getContractFactory("CharityAuction");
  
  // Deploy the contract
  const charityAuction = await CharityAuction.deploy();
  
  // Wait for deployment to finish
  await charityAuction.deployed();
  
  console.log("CharityAuction deployed to:", charityAuction.address);
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
