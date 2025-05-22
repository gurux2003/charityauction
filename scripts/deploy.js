const { ethers } = require("hardhat");

async function main() {
  const CharityAuction = await ethers.getContractFactory("CharityAuction");
  const charityAuction = await CharityAuction.deploy();

  await charityAuction.waitForDeployment();  // <== use this instead of deployed()

  console.log("CharityAuction deployed to:", charityAuction.target); // <== address is in .target
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
