import React, { useEffect, useState } from "react";
import { ethers, isAddress } from "ethers";
import NFT_ABI from "./MyTestNFT.json";
import AUCTION_ABI from "./CharityAuction.json";
import './App.css';
import './index.css';

const NFT_ADDRESS = "0xC0aDa621a5a5eEdE0aCC4E25a97e7Ef98a5134c8"; 
const AUCTION_ADDRESS = "0x68d8C83874362eB3F4a03405fCd0538F787425cA";

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
      const startPrice = ethers.parseEther(formData.startPrice || "0");

      const duration = Number(formData.duration);
      const charityAddr = formData.charityAddress;

      if (isNaN(tokenId)) return alert("Invalid NFT Token ID");
      if (isNaN(duration)) return alert("Invalid duration");
      if (!isAddress(charityAddr)) return alert("Invalid charity address");
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
      const bidAmount = ethers.parseEther(formData.bidAmount || "0");
      if (isNaN(auctionId)) return alert("Invalid auction ID");
      const tx = await auctionContract.placeBid(auctionId, { value: bidAmount });
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
      const now = Math.floor(Date.now() / 1000);
      const active = [];

      for (let i = 0; i < activeIds.length; i++) {
        const auctionIdNum = Number(activeIds[i]);
        const auction = await auctionContract.auctions(auctionIdNum);

        if (!auction.ended) {
          const endTimeNum = Number(auction.endTime);
          const timeLeft = endTimeNum > now ? endTimeNum - now : 0;

          active.push({
            auctionId: auctionIdNum.toString(),
            tokenId: auction.tokenId.toString(),
            startPrice: ethers.formatEther(auction.startPrice),
            charity: auction.charity,
            highestBid: ethers.formatEther(auction.highestBid),
            highestBidder: auction.highestBidder,
            duration: timeLeft.toString(),
            ended: auction.ended,
          });
        }
      }

      setAuctions(active);
    } catch (error) {
      alert("Load auctions failed: " + (error?.message || error));
    }
  }

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function debugOwnerOf(tokenId) {
    if (!nftContract) {
      alert("Please connect wallet first!");
      return;
    }
    if (typeof tokenId !== "number" || tokenId < 0) {
      alert("Invalid tokenId for debug");
      return;
    }
    try {
      const owner = await nftContract.ownerOf(tokenId);
      alert(`Owner of token ID ${tokenId} is ${owner}`);
      console.log(`Owner of token ID ${tokenId}:`, owner);
    } catch (error) {
      alert(`Error calling ownerOf(${tokenId}): ${error.message || error}`);
      console.error("ownerOf error:", error);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Charity Auction DApp</h1>
        <button onClick={connectWallet} className="connect-button">
          {userAddress ? `Connected: ${userAddress}` : "Connect Wallet"}
        </button>
      </header>

      <section className="section">
        <h2>Mint NFT</h2>
        <button onClick={mintNFT} className="action-button" disabled={minting}>
          {minting ? "Minting..." : "Mint NFT"}
        </button>
      </section>

      <section className="section">
        <h2>Approve NFT</h2>
        <input
          type="number"
          name="approveTokenId"
          placeholder="NFT Token ID"
          value={formData.approveTokenId}
          onChange={handleChange}
          className="input"
        />
        <button onClick={approveNFT} className="action-button">Approve</button>
      </section>

      <section className="section">
        <h2>Create Auction</h2>
        <input
          type="number"
          name="auctionTokenId"
          placeholder="NFT Token ID"
          value={formData.auctionTokenId}
          onChange={handleChange}
          className="input"
        />
        <input
          type="text"
          name="startPrice"
          placeholder="Start Price (ETH)"
          value={formData.startPrice}
          onChange={handleChange}
          className="input"
        />
        <input
          type="number"
          name="duration"
          placeholder="Duration (seconds)"
          value={formData.duration}
          onChange={handleChange}
          className="input"
        />
        <input
          type="text"
          name="charityAddress"
          placeholder="Charity Address"
          value={formData.charityAddress}
          onChange={handleChange}
          className="input"
        />
        <button onClick={createAuction} className="action-button">Create Auction</button>
      </section>

      <section className="section">
        <h2>Place Bid</h2>
        <input
          type="number"
          name="bidAuctionId"
          placeholder="Auction ID"
          value={formData.bidAuctionId}
          onChange={handleChange}
          className="input"
        />
        <input
          type="text"
          name="bidAmount"
          placeholder="Bid Amount (ETH)"
          value={formData.bidAmount}
          onChange={handleChange}
          className="input"
        />
        <button onClick={placeBid} className="action-button">Place Bid</button>
      </section>

      <section className="section">
        <h2>End Auction</h2>
        <input
          type="number"
          name="endAuctionId"
          placeholder="Auction ID"
          value={formData.endAuctionId}
          onChange={handleChange}
          className="input"
        />
        <button onClick={endAuction} className="action-button">End Auction</button>
      </section>

      <section className="section">
        <h2>Withdraw Bid</h2>
        <input
          type="number"
          name="withdrawAuctionId"
          placeholder="Auction ID"
          value={formData.withdrawAuctionId}
          onChange={handleChange}
          className="input"
        />
        <button onClick={withdrawBid} className="action-button">Withdraw</button>
      </section>

      <section className="section">
        <h2>Active Auctions</h2>
        <button onClick={loadActiveAuctions} className="action-button">Load Active Auctions</button>
        <ul>
          {auctions.map((a) => (
            <li key={a.auctionId}>
              Auction #{a.auctionId} | Token #{a.tokenId} | Start Price: {a.startPrice} ETH | Highest Bid: {a.highestBid} ETH | Charity: {a.charity} | Time Left: {a.duration} seconds
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

export default App;
