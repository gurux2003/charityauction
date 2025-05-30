import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import NFT_ABI from "./MyTestNFT.json";
import AUCTION_ABI from "./CharityAuction.json";

const NFT_ADDRESS = "0x5B0e1547480FB9EA6F6F88C24604c7be3026d2d4";
const AUCTION_ADDRESS = "0x6749b9342AF09cb9C474Cc972f718DE9cd1CC882";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [userAddress, setUserAddress] = useState("");
  const [nftContract, setNftContract] = useState(null);
  const [auctionContract, setAuctionContract] = useState(null);
  const [minting, setMinting] = useState(false);
  const [auctions, setAuctions] = useState([]);
  const [formData, setFormData] = useState({
    approveTokenId: "",
    auctionTokenId: "",
    startPrice: "",
    duration: "",
    charityAddress: "",
    bidAuctionId: "",
    bidAmount: "",
    endAuctionId: "",
    withdrawAuctionId: "",
  });

  useEffect(() => {
    if (window.ethereum) {
      const prov = new ethers.BrowserProvider(window.ethereum);
      setProvider(prov);
    } else {
      alert("Please install MetaMask!");
    }
  }, []);

  async function connectWallet() {
    if (!provider) return alert("Provider not initialized");
    await provider.send("eth_requestAccounts", []);
    const signer = await provider.getSigner();
    setSigner(signer);
    const addr = await signer.getAddress();
    setUserAddress(addr);

    const nft = new ethers.Contract(NFT_ADDRESS, NFT_ABI.abi, signer);
    const auction = new ethers.Contract(AUCTION_ADDRESS, AUCTION_ABI.abi, signer);

    setNftContract(nft);
    setAuctionContract(auction);
  }

  async function mintNFT() {
    if (!nftContract) return alert("Connect wallet first!");
    try {
      setMinting(true);
      const tx = await nftContract.mint();
      await tx.wait();
      alert("NFT minted successfully!");
    } catch (error) {
      alert("Minting failed: " + (error?.message || error));
    } finally {
      setMinting(false);
    }
  }

  async function approveNFT() {
    if (!nftContract || !auctionContract) return alert("Connect wallet first!");
    try {
      const tokenId = Number(formData.approveTokenId);
      if (isNaN(tokenId)) return alert("Invalid NFT Token ID");
      const tx = await nftContract.approve(AUCTION_ADDRESS, tokenId);
      await tx.wait();
      alert(`NFT ${tokenId} approved for auction contract`);
    } catch (error) {
      alert("Approval failed: " + (error?.message || error));
    }
  }

  async function createAuction() {
    if (!auctionContract) return alert("Connect wallet first!");
    try {
      const tokenId = Number(formData.auctionTokenId);
      if (isNaN(tokenId)) return alert("Invalid NFT Token ID");

      const startPrice = ethers.parseEther(formData.startPrice || "0");
      const duration = Number(formData.duration);
      if (isNaN(duration)) return alert("Invalid duration");

      const charityAddr = formData.charityAddress;
      if (!ethers.isAddress(charityAddr)) return alert("Invalid charity address");

      // Note: Passing nftAddress as first arg (required)
      const tx = await auctionContract.createAuction(
        NFT_ADDRESS,
        tokenId,
        startPrice,
        duration,
        charityAddr
      );
      await tx.wait();
      alert("Auction created!");
    } catch (error) {
      alert("Create auction failed: " + (error?.message || error));
    }
  }

  async function placeBid() {
    if (!auctionContract) return alert("Connect wallet first!");
    try {
      const auctionId = Number(formData.bidAuctionId);
      if (isNaN(auctionId)) return alert("Invalid auction ID");
      const bidAmount = ethers.parseEther(formData.bidAmount || "0");

      const tx = await auctionContract.bid(auctionId, { value: bidAmount });
      await tx.wait();
      alert("Bid placed!");
    } catch (error) {
      alert("Bid failed: " + (error?.message || error));
    }
  }

  async function endAuction() {
    if (!auctionContract) return alert("Connect wallet first!");
    try {
      const auctionId = Number(formData.endAuctionId);
      if (isNaN(auctionId)) return alert("Invalid auction ID");

      const tx = await auctionContract.endAuction(auctionId);
      await tx.wait();
      alert("Auction ended!");
    } catch (error) {
      alert("End auction failed: " + (error?.message || error));
    }
  }

  async function withdrawBid() {
    if (!auctionContract) return alert("Connect wallet first!");
    try {
      const auctionId = Number(formData.withdrawAuctionId);
      if (isNaN(auctionId)) return alert("Invalid auction ID");

      const tx = await auctionContract.withdrawBid(auctionId);
      await tx.wait();
      alert("Bid withdrawn!");
    } catch (error) {
      alert("Withdraw failed: " + (error?.message || error));
    }
  }

  async function loadActiveAuctions() {
  if (!auctionContract) return alert("Connect wallet first!");

  try {
    const activeIds = await auctionContract.getActiveAuctions();
    const active = [];

    for (let i = 0; i < activeIds.length; i++) {
      const auctionId = activeIds[i];
      const auction = await auctionContract.auctions(auctionId);

      if (!auction.ended) {
        active.push({
          auctionId: auctionId.toString(),
          tokenId: auction.tokenId.toString(),
          startPrice: ethers.formatEther(auction.startPrice),
          charity: auction.charity,
          highestBid: ethers.formatEther(auction.highestBid),
          highestBidder: auction.highestBidder,
          duration: auction.endTime.sub(auction.startTime).toString(), // or however you calculate duration
          ended: auction.ended,
        });
      }
    }
    setAuctions(active);
  } catch (error) {
    alert("Load auctions failed: " + error.message);
  }
}


  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div style={{ padding: 20, maxWidth: 600, margin: "auto" }}>
      <h1>Charity Auction DApp</h1>
      <button onClick={connectWallet}>
        {userAddress ? `Connected: ${userAddress}` : "Connect Wallet"}
      </button>

      <hr />

      <button onClick={mintNFT} disabled={minting}>
        {minting ? "Minting..." : "Mint NFT"}
      </button>

      <hr />

      <div>
        <h3>Approve NFT</h3>
        <input
          type="number"
          name="approveTokenId"
          placeholder="NFT Token ID"
          value={formData.approveTokenId}
          onChange={handleChange}
        />
        <button onClick={approveNFT}>Approve</button>
      </div>

      <hr />

      <div>
        <h3>Create Auction</h3>
        <input
          type="number"
          name="auctionTokenId"
          placeholder="NFT Token ID"
          value={formData.auctionTokenId}
          onChange={handleChange}
        />
        <input
          type="text"
          name="startPrice"
          placeholder="Start Price (ETH)"
          value={formData.startPrice}
          onChange={handleChange}
        />
        <input
          type="number"
          name="duration"
          placeholder="Duration (seconds)"
          value={formData.duration}
          onChange={handleChange}
        />
        <input
          type="text"
          name="charityAddress"
          placeholder="Charity Address"
          value={formData.charityAddress}
          onChange={handleChange}
        />
        <button onClick={createAuction}>Create Auction</button>
      </div>

      <hr />

      <div>
        <h3>Place Bid</h3>
        <input
          type="number"
          name="bidAuctionId"
          placeholder="Auction ID"
          value={formData.bidAuctionId}
          onChange={handleChange}
        />
        <input
          type="text"
          name="bidAmount"
          placeholder="Bid Amount (ETH)"
          value={formData.bidAmount}
          onChange={handleChange}
        />
        <button onClick={placeBid}>Place Bid</button>
      </div>

      <hr />

      <div>
        <h3>End Auction</h3>
        <input
          type="number"
          name="endAuctionId"
          placeholder="Auction ID"
          value={formData.endAuctionId}
          onChange={handleChange}
        />
        <button onClick={endAuction}>End Auction</button>
      </div>

      <hr />

      <div>
        <h3>Withdraw Bid</h3>
        <input
          type="number"
          name="withdrawAuctionId"
          placeholder="Auction ID"
          value={formData.withdrawAuctionId}
          onChange={handleChange}
        />
        <button onClick={withdrawBid}>Withdraw Bid</button>
      </div>

      <hr />

      <button onClick={loadActiveAuctions}>Load Active Auctions</button>

      <h3>Active Auctions:</h3>
      <ul>
        {auctions.map((a) => (
          <li key={a.auctionId}>
            Auction ID: {a.auctionId}, Token ID: {a.tokenId}, Start Price: {a.startPrice} ETH, Charity:{" "}
            {a.charity}, Highest Bid: {a.highestBid} ETH, Highest Bidder: {a.highestBidder}, Duration:{" "}
            {a.duration}s, Ended: {a.ended ? "Yes" : "No"}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
