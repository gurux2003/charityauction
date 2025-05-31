import React, { useEffect, useState } from "react";
import { ethers, isAddress } from "ethers";
import NFT_ABI from "./MyTestNFT.json";
import AUCTION_ABI from "./CharityAuction.json";
import './App.css';
import './index.css';

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
  const [history, setHistory] = useState([]);
  const [formData, setFormData] = useState({
    approveTokenId: "",
    auctionTokenId: "",
    startPrice: "",
    duration: "",
    charityAddress: "",
    buyNowPrice: "",
    bidAuctionId: "",
    bidAmount: "",
    endAuctionId: "",
    withdrawAuctionId: "",
    extendAuctionId: "",
    reclaimAuctionId: ""
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
    try {
      const tokenId = Number(formData.approveTokenId);
      if (!nftContract || !auctionContract || isNaN(tokenId)) return alert("Invalid token ID or wallet not connected.");
      const tx = await nftContract.approve(AUCTION_ADDRESS, tokenId);
      await tx.wait();
      alert(`NFT ${tokenId} approved for auction.`);
    } catch (error) {
      alert("Approval failed: " + (error?.message || error));
    }
  }

  async function createAuction() {
    try {
      const tokenId = Number(formData.auctionTokenId);
      const startPrice = ethers.parseEther(formData.startPrice || "0");
      const buyNowPrice = ethers.parseEther(formData.buyNowPrice || "0");
      const duration = Number(formData.duration);
      const charityAddr = formData.charityAddress;

      if (!isAddress(charityAddr)) return alert("Invalid charity address");
      if (!auctionContract) return;

      const isApproved = await auctionContract.isApprovedCharity(charityAddr);
      if (!isApproved) return alert("Charity not approved");

      const tx = await auctionContract.createAuction(
        NFT_ADDRESS,
        tokenId,
        startPrice,
        duration,
        charityAddr,
        buyNowPrice
      );
      await tx.wait();
      alert("Auction created!");
    } catch (error) {
      alert("Create auction failed: " + (error?.message || error));
    }
  }

  async function placeBid() {
    try {
      const auctionId = Number(formData.bidAuctionId);
      const bidAmount = ethers.parseEther(formData.bidAmount || "0");
      if (!auctionContract || isNaN(auctionId)) return;

      const auction = await auctionContract.auctions(auctionId);
      const minIncrement = await auctionContract.minimumBidIncrement();
      if (bidAmount < auction.highestBid + minIncrement) {
        return alert("Bid does not meet minimum increment");
      }

      const isWhitelisted = await auctionContract.isWhitelisted(userAddress);
      if (!isWhitelisted) return alert("You are not whitelisted to bid");

      const tx = await auctionContract.placeBid(auctionId, { value: bidAmount });
      await tx.wait();
      alert("Bid placed!");
    } catch (error) {
      alert("Bid failed: " + (error?.message || error));
    }
  }

  async function buyNow() {
    try {
      const auctionId = Number(formData.bidAuctionId);
      const auction = await auctionContract.auctions(auctionId);
      const tx = await auctionContract.buyNow(auctionId, { value: auction.buyNowPrice });
      await tx.wait();
      alert("NFT purchased instantly!");
    } catch (error) {
      alert("Buy Now failed: " + (error?.message || error));
    }
  }

  async function endAuction() {
    try {
      const auctionId = Number(formData.endAuctionId);
      const tx = await auctionContract.endAuction(auctionId);
      await tx.wait();
      alert("Auction ended!");
    } catch (error) {
      alert("End auction failed: " + (error?.message || error));
    }
  }

  async function withdrawBid() {
    try {
      const auctionId = Number(formData.withdrawAuctionId);
      const tx = await auctionContract.withdrawBid(auctionId);
      await tx.wait();
      alert("Bid withdrawn!");
    } catch (error) {
      alert("Withdraw failed: " + (error?.message || error));
    }
  }

  async function extendAuction() {
    try {
      const auctionId = Number(formData.extendAuctionId);
      const tx = await auctionContract.extendAuction(auctionId);
      await tx.wait();
      alert("Auction extended!");
    } catch (error) {
      alert("Extend failed: " + (error?.message || error));
    }
  }

  async function reclaimNFT() {
    try {
      const auctionId = Number(formData.reclaimAuctionId);
      const tx = await auctionContract.reclaimNFT(auctionId);
      await tx.wait();
      alert("NFT reclaimed!");
    } catch (error) {
      alert("Reclaim failed: " + (error?.message || error));
    }
  }

  async function loadActiveAuctions() {
    try {
      const ids = await auctionContract.getActiveAuctions();
      const now = Math.floor(Date.now() / 1000);
      const active = [];

      for (let id of ids) {
        const auction = await auctionContract.auctions(id);
        if (!auction.ended) {
          active.push({
            auctionId: id.toString(),
            tokenId: auction.tokenId.toString(),
            startPrice: ethers.formatEther(auction.startPrice),
            highestBid: ethers.formatEther(auction.highestBid),
            highestBidder: auction.highestBidder,
            charity: auction.charity,
            buyNowPrice: ethers.formatEther(auction.buyNowPrice),
            timeLeft: Number(auction.endTime) - now
          });
        }
      }
      setAuctions(active);
    } catch (error) {
      alert("Failed to load auctions: " + error.message);
    }
  }

  async function loadAuctionHistory() {
    try {
      const count = await auctionContract.auctionCounter();
      const result = [];

      for (let i = 0; i < Number(count); i++) {
        const a = await auctionContract.auctions(i);
        if (a.ended) {
          result.push({
            id: i,
            tokenId: a.tokenId.toString(),
            highestBid: ethers.formatEther(a.highestBid),
            winner: a.highestBidder,
            charity: a.charity
          });
        }
      }
      setHistory(result);
    } catch (error) {
      alert("Failed to load history: " + error.message);
    }
  }

  function handleChange(e) {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Charity Auction DApp</h1>
        <button onClick={connectWallet} className="connect-button">
          {userAddress ? `Connected: ${userAddress}` : "Connect Wallet"}
        </button>
      </header>

      <section className="section"><h2>Mint NFT</h2><button onClick={mintNFT} className="action-button" disabled={minting}>{minting ? "Minting..." : "Mint NFT"}</button></section>

      <section className="section"><h2>Approve NFT</h2>
        <input type="number" name="approveTokenId" value={formData.approveTokenId} onChange={handleChange} placeholder="Token ID" className="input" />
        <button onClick={approveNFT} className="action-button">Approve</button>
      </section>

      <section className="section"><h2>Create Auction</h2>
        <input type="number" name="auctionTokenId" value={formData.auctionTokenId} onChange={handleChange} placeholder="Token ID" className="input" />
        <input type="text" name="startPrice" value={formData.startPrice} onChange={handleChange} placeholder="Start Price (ETH)" className="input" />
        <input type="text" name="buyNowPrice" value={formData.buyNowPrice} onChange={handleChange} placeholder="Buy Now Price (ETH)" className="input" />
        <input type="number" name="duration" value={formData.duration} onChange={handleChange} placeholder="Duration (sec)" className="input" />
        <input type="text" name="charityAddress" value={formData.charityAddress} onChange={handleChange} placeholder="Charity Address" className="input" />
        <button onClick={createAuction} className="action-button">Create Auction</button>
      </section>

      <section className="section"><h2>Bid / Buy Now</h2>
        <input type="number" name="bidAuctionId" value={formData.bidAuctionId} onChange={handleChange} placeholder="Auction ID" className="input" />
        <input type="text" name="bidAmount" value={formData.bidAmount} onChange={handleChange} placeholder="Bid Amount (ETH)" className="input" />
        <button onClick={placeBid} className="action-button">Place Bid</button>
        <button onClick={buyNow} className="action-button">Buy Now</button>
      </section>

      <section className="section"><h2>End Auction</h2>
        <input type="number" name="endAuctionId" value={formData.endAuctionId} onChange={handleChange} placeholder="Auction ID" className="input" />
        <button onClick={endAuction} className="action-button">End Auction</button>
      </section>

      <section className="section"><h2>Withdraw Bid</h2>
        <input type="number" name="withdrawAuctionId" value={formData.withdrawAuctionId} onChange={handleChange} placeholder="Auction ID" className="input" />
        <button onClick={withdrawBid} className="action-button">Withdraw Bid</button>
      </section>

      <section className="section"><h2>Extend Auction</h2>
        <input type="number" name="extendAuctionId" value={formData.extendAuctionId} onChange={handleChange} placeholder="Auction ID" className="input" />
        <button onClick={extendAuction} className="action-button">Extend Auction</button>
      </section>

      <section className="section"><h2>Reclaim NFT</h2>
        <input type="number" name="reclaimAuctionId" value={formData.reclaimAuctionId} onChange={handleChange} placeholder="Auction ID" className="input" />
        <button onClick={reclaimNFT} className="action-button">Reclaim NFT</button>
      </section>

      <section className="section"><h2>Active Auctions</h2>
        <button onClick={loadActiveAuctions} className="action-button">Load</button>
        <ul>{auctions.map(a => (
          <li key={a.auctionId}>
            <strong>ID:</strong> {a.auctionId} | <strong>Token:</strong> {a.tokenId} | <strong>Highest Bid:</strong> {a.highestBid} ETH | <strong>Time Left:</strong> {a.timeLeft}s | <strong>Buy Now:</strong> {a.buyNowPrice} ETH
          </li>
        ))}</ul>
      </section>

      <section className="section"><h2>Auction History</h2>
        <button onClick={loadAuctionHistory} className="action-button">Load</button>
        <ul>{history.map(h => (
          <li key={h.id}>
            <strong>ID:</strong> {h.id} | <strong>Token:</strong> {h.tokenId} | <strong>Winner:</strong> {h.winner} | <strong>Bid:</strong> {h.highestBid} ETH
          </li>
        ))}</ul>
      </section>
    </div>
  );
}

export default App;
