// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol"; // for CharityAuction
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/utils/Base64.sol";

/// @notice NFT contract using OpenZeppelin ERC721 with on-chain metadata
contract MyTestNFT is ERC721 {
    uint256 public nextTokenId;

    constructor() ERC721("MyTestNFT", "MTNFT") {}

    /// @notice Mint a new NFT to the sender
    function mint() external {
        _safeMint(msg.sender, nextTokenId);
        nextTokenId++;
    }

    /// @notice Override tokenURI to return base64 encoded on-chain metadata with inline SVG
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_ownerOf(tokenId) != address(0), "Token does not exist");

        string memory svg = Base64.encode(bytes(string(abi.encodePacked(
            '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">',
            '<rect width="300" height="300" fill="purple"/>',
            '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-size="24">',
            "MyTestNFT #", Strings.toString(tokenId),
            '</text></svg>'
        ))));

        string memory json = Base64.encode(bytes(string(abi.encodePacked(
            '{"name": "MyTestNFT #', Strings.toString(tokenId),
            '", "description": "An NFT fully stored on-chain with inline SVG image", ',
            '"image": "data:image/svg+xml;base64,', svg, '"}'
        ))));

        return string(abi.encodePacked("data:application/json;base64,", json));
    }
}

/// @notice NFT Auction contract accepting any ERC721 token
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
    }

    uint256 public auctionCount;
    mapping(uint256 => Auction) public auctions;
    mapping(uint256 => mapping(address => uint256)) public bids;
    uint256[] public activeAuctions;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed nftAddress,
        uint256 indexed tokenId,
        address seller,
        uint256 startPrice,
        uint256 startTime,
        uint256 endTime,
        address charity
    );
    event BidPlaced(uint256 indexed auctionId, address indexed bidder, uint256 amount);
    event AuctionEnded(uint256 indexed auctionId, address winner, uint256 amount, address charity);
    event AuctionCancelled(uint256 indexed auctionId);
    event CharityUpdated(uint256 indexed auctionId, address newCharity);

    /// @notice Create a new auction for a given NFT
    function createAuction(
        address _nftAddress,
        uint256 _tokenId,
        uint256 _startPrice,
        uint256 _duration,
        address _charity
    ) external {
        require(_duration > 0, "Duration must be > 0");
        require(_charity != address(0), "Invalid charity address");

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
            charity: _charity
        });

        activeAuctions.push(auctionCount);
        emit AuctionCreated(auctionCount, _nftAddress, _tokenId, msg.sender, _startPrice, currentTime, currentTime + _duration, _charity);
    }

    /// @notice Place a bid on an active auction
    function placeBid(uint256 _auctionId) external payable {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp < auction.endTime, "Auction ended");
        require(msg.value >= auction.startPrice, "Below start price");
        require(msg.value > auction.highestBid, "Must beat highest bid");
        if (auction.highestBid > 0) {
            bids[_auctionId][auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = msg.sender;

        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }

    /// @notice End an auction after its duration
    function endAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTime, "Auction not over");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;
        _removeFromActiveAuctions(_auctionId);

        if (auction.highestBid > 0) {
          
            IERC721(auction.nftAddress).transferFrom(address(this), auction.highestBidder, auction.tokenId);
           
            payable(auction.charity).transfer(auction.highestBid);

            emit AuctionEnded(_auctionId, auction.highestBidder, auction.highestBid, auction.charity);
        } else {
            IERC721(auction.nftAddress).transferFrom(address(this), auction.seller, auction.tokenId);
        }
    }

    /// @notice Cancel an auction if no bids were placed
    function cancelAuction(uint256 _auctionId) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.seller, "Not the seller");
        require(auction.highestBid == 0, "Already has bids");
        require(!auction.ended, "Auction already ended");

        auction.ended = true;
        _removeFromActiveAuctions(_auctionId);

        IERC721(auction.nftAddress).transferFrom(address(this), auction.seller, auction.tokenId);
        emit AuctionCancelled(_auctionId);
    }

    /// @notice Update charity address before auction ends
    function updateCharityAddress(uint256 _auctionId, address _newCharity) external {
        Auction storage auction = auctions[_auctionId];
        require(msg.sender == auction.seller, "Only seller can update");
        require(!auction.ended, "Auction ended");
        require(_newCharity != address(0), "Invalid address");

        auction.charity = _newCharity;
        emit CharityUpdated(_auctionId, _newCharity);
    }

    /// @notice Withdraw overbid amounts for bidders
    function withdrawBid(uint256 _auctionId) external {
        uint256 amount = bids[_auctionId][msg.sender];
        require(amount > 0, "No withdrawable bid");

        bids[_auctionId][msg.sender] = 0;
        payable(msg.sender).transfer(amount);
    }

    /// @notice View current highest bidder and bid amount
    function getCurrentBidDetails(uint256 _auctionId) external view returns (address bidder, uint256 amount) {
        Auction memory auction = auctions[_auctionId];
        return (auction.highestBidder, auction.highestBid);
    }

    /// @notice View list of active auction IDs
    function getActiveAuctions() external view returns (uint256[] memory) {
        return activeAuctions;
    }

    /// @notice View details of a specific auction
    function getAuction(uint256 _auctionId) external view returns (Auction memory) {
        return auctions[_auctionId];
    }

    /// @dev Internal helper to remove auction from active list
    function _removeFromActiveAuctions(uint256 _auctionId) internal {
        for (uint256 i = 0; i < activeAuctions.length; i++) {
            if (activeAuctions[i] == _auctionId) {
                activeAuctions[i] = activeAuctions[activeAuctions.length - 1];
                activeAuctions.pop();
                break;
            }
        }
    }
}
