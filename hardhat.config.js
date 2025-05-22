require("@nomicfoundation/hardhat-toolbox");

const { PrivateKey } = require("./secret.json"); // Make sure secret.json exports { "PrivateKey": "yourkey" }

module.exports = {
  defaultNetwork: "testnet",

  networks: {
    hardhat: {},
    testnet: {
      url: "https://rpc.test2.btcs.network",
      accounts: [''], // Using your key from secret.json
      chainId: 1114,
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          evmVersion: "shanghai",
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },

  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },

  mocha: {
    timeout: 20000,
  },
};
