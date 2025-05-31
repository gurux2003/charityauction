// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/// @notice NFT contract
contract MyTestNFT is ERC721 {
    uint256 public nextTokenId;

    constructor() ERC721("MyTestNFT", "MTNFT") {}

    function mint() external {
        _safeMint(msg.sender, nextTokenId);
        nextTokenId++;
    }
}

/// @notice Charity NFT Auction
contract CharityAuction {
    struct Auction {
        address seller;
        address nftAddress;
        uint256 tokenId;
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 startTime;
        uint256 endTime;
        bool ended;
        address charity;
        uint256 buyNowPrice;
    }

    uint256 public auctionCount;
    uint256 public minBidIncrement = 0.01 ether;
    uint256 public platformFee = 250; // 2.5% = 250 / 10000
    address public feeRecipient;
    address public owner;
    uint256 public extensionWindow = 5 minutes;
    uint256 public extensionDuration = 10 minutes;

    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => uint256)) public bids;
    mapping(uint256 => mapping(address => bool)) public isWhitelistedBidder;
    mapping(address => bool) public approvedCharities;

    uint256[] public activeAuctions;
    uint256[] public endedAuctions;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed nftAddress,
        uint256 indexed tokenId,
        address seller,
        uint256 startPrice,
        uint256 startTime,
        uint256 endTime,
        address charity,
        uint256 buyNowPrice
    );
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event BidWithdrawn(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount, address charity);
    event AuctionCancelled(uint256 indexed auctionId);
    event CharityUpdated(uint256 indexed auctionId, address newCharity);
    event BuyNowExecuted(uint256 indexed auctionId, address buyer, uint256 amount);

    constructor(address _feeRecipient) {
        owner = msg.sender;
        feeRecipient = _feeRecipient;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function createAuction(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _startPrice,
        uint256 _duration,
        address _charity,
        uint256 _buyNowPrice
    ) external {
        require(_duration > 0, "Duration must be > 0");
        require(_charity != address(0) && approvedCharities[_charity], "Unapproved charity");

        IERC721 nft = IERC721(_nftAddress);
        require(nft.ownerOf(_tokenId) == msg.sender, "Not NFT owner");

        nft.transferFrom(msg.sender, address(this), _tokenId);

        auctionCount++;
        uint256 currentTime = block.timestamp;
        auctions[auctionCount] = Auction({
            seller: msg.sender,
            nftAddress: _nftAddress,
            tokenId: _tokenId,
            startPrice: _startPrice,
            highestBid: 0,
            highestBidder: address(0),
            startTime: currentTime,
            endTime: currentTime + _duration,
            ended: false,
            charity: _charity,
            buyNowPrice: _buyNowPrice
        });

        activeAuctions.push(auctionCount);
        emit AuctionCreated(auctionCount, _nftAddress, _tokenId, msg.sender, _startPrice, currentTime, currentTime + _duration, _charity, _buyNowPrice);
    }

    function placeBid(uint256 _auctionId) external payable {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp < auction.endTime, "Auction ended");
        require(!auction.ended, "Auction over");
        require(msg.value >= auction.startPrice, "Below start price");
        require(msg.value >= auction.highestBid + minBidIncrement, "Insufficient increment");

        if (auction.highestBid > 0) {
            bids[_auctionId][auction.highestBidder] = auction.highestBid;
        }

        if (block.timestamp + extensionWindow >= auction.endTime) {
            auction.endTime += extensionDuration;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }

    function buyNow(uint256 _auctionId) external payable {
        Auction storage auction = auctions[_auctionId];
        require(!auction.ended, "Already ended");
        require(auction.buyNowPrice > 0, "No buy now");
        require(msg.value >= auction.buyNowPrice, "Insufficient buy now");

        auction.ended = true;
        _removeFromActiveAuctions(_auctionId);
        endedAuctions.push(_auctionId);

        IERC721(auction.nftAddress).transferFrom(address(this), msg.sender, auction.tokenId);

        uint256 fee = (msg.value * platformFee) / 10000;
        payable(feeRecipient).transfer(fee);
        payable(auction.charity).transfer(msg.value - fee);

        emit BuyNowExecuted(_auctionId, msg.sender, msg.value);
    }

    function endAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTime, "Auction not over");
        require(!auction.ended, "Already ended");

        auction.ended = true;
        _removeFromActiveAuctions(_auctionId);
        endedAuctions.push(_auctionId);

        if (auction.highestBid > 0) {
            IERC721(auction.nftAddress).transferFrom(address(this), auction.highestBidder, auction.tokenId);
            uint256 fee = (auction.highestBid * platformFee) / 10000;
            payable(feeRecipient).transfer(fee);
            payable(auction.charity).transfer(auction.highestBid - fee);
            emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid, auction.charity);
        } else {
            IERC721(auction.nftAddress).transferFrom(address(this), auction.seller, auction.tokenId);
        }
    }

    function reclaimUnsoldNFT(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.seller, "Not seller");
        require(block.timestamp > auction.endTime, "Auction not over");
        require(auction.highestBid == 0, "Has bids");
        require(!auction.ended, "Already ended");

        auction.ended = true;
        _removeFromActiveAuctions(_auctionId);
        endedAuctions.push(_auctionId);
        IERC721(auction.nftAddress).transferFrom(address(this), auction.seller, auction.tokenId);
    }

    function cancelAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.seller, "Not seller");
        require(auction.highestBid == 0, "Already has bids");
        require(!auction.ended, "Already ended");

        auction.ended = true;
        _removeFromActiveAuctions(_auctionId);
        IERC721(auction.nftAddress).transferFrom(address(this), auction.seller, auction.tokenId);
        endedAuctions.push(_auctionId);
        emit AuctionCancelled(_auctionId);
    }

    function withdrawBid(uint256 _auctionId) external {
        uint256 amount = bids[_auctionId][msg.sender];
        require(amount > 0, "Nothing to withdraw");

        bids[_auctionId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);

        emit BidWithdrawn(_auctionId, msg.sender, amount);
    }

    function updateCharityAddress(uint256 _auctionId, address _newCharity) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.seller, "Only seller");
        require(!auction.ended, "Already ended");
        require(approvedCharities[_newCharity], "Not approved");

        auction.charity = _newCharity;
        emit CharityUpdated(_auctionId, _newCharity);
    }

    function getCurrentBidDetails(uint256 _auctionId) external view returns (address bidder, uint256 amount) {
        Auction memory auction = auctions[_auctionId];
        return (auction.highestBidder, auction.highestBid);
    }

    function getActiveAuctions() external view returns (uint256[] memory) {
        return activeAuctions;
    }

    function getEndedAuctions() external view returns (uint256[] memory) {
        return endedAuctions;
    }

    function getAuction(uint256 _auctionId) external view returns (Auction memory) {
        return auctions[_auctionId];
    }

    function _removeFromActiveAuctions(uint256 _auctionId) internal {
        for (uint256 i = 0; i < activeAuctions.length; i++) {
            if (activeAuctions[i] == _auctionId) {
                activeAuctions[i] = activeAuctions[activeAuctions.length - 1];
                activeAuctions.pop();
                break;
            }
        }
    }

    // Admin functions
    function approveCharity(address _charity, bool approved) external onlyOwner {
        approvedCharities[_charity] = approved;
    }

    function addWhitelistedBidder(uint256 _auctionId, address _bidder) external {
        require(msg.sender == auctions[_auctionId].seller, "Not seller");
        isWhitelistedBidder[_auctionId][_bidder] = true;
    }

    function setPlatformFee(uint256 _fee) external onlyOwner {
        require(_fee <= 1000, "Max 10%");
        platformFee = _fee;
    }

    function setFeeRecipient(address _recipient) external onlyOwner {
        require(_recipient != address(0), "Zero address");
        feeRecipient = _recipient;
    }

    function setMinBidIncrement(uint256 _amount) external onlyOwner {
        minBidIncrement = _amount;
    }
}
