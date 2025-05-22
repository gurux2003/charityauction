// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IERC721 {
    function transferFrom(address from, address to, uint256 tokenId) external;
}
contract CharityAuction {
    struct Auction {
        address nftAddress;
        uint256 tokenId;
        address payable charity;
        address payable seller;
        uint256 endTime;
        uint256 highestBid;
        address payable highestBidder;
        bool ended;
    }

    uint256 public auctionCount;
    mapping(uint256 => Auction) public auctions;

    mapping(address => uint256) private pendingReturns; // Manual reentrancy-safe refunds
    bool private locked; // reentrancy lock

    modifier noReentrant() {
        require(!locked, "Reentrancy blocked");
        locked = true;
        _;
        locked = false;
    }

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed nftAddress,
        uint256 indexed tokenId,
        address seller,
        address charity,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address winner,
        uint256 amount,
        address charity
    );

    function createAuction(
        address _nftAddress,
        uint256 _tokenId,
        address payable _charity,
        uint256 _durationInMinutes,
        uint256 _minBid
    ) external {
        require(_durationInMinutes > 0, "Duration must be > 0");

        IERC721(_nftAddress).transferFrom(msg.sender, address(this), _tokenId);

        auctions[auctionCount] = Auction({
            nftAddress: _nftAddress,
            tokenId: _tokenId,
            charity: _charity,
            seller: payable(msg.sender),
            endTime: block.timestamp + (_durationInMinutes * 1 minutes),
            highestBid: _minBid,
            highestBidder: payable(address(0)),
            ended: false
        });

        emit AuctionCreated(
            auctionCount,
            _nftAddress,
            _tokenId,
            msg.sender,
            _charity,
            block.timestamp + (_durationInMinutes * 1 minutes)
        );

        auctionCount++;
    }

    function placeBid(uint256 _auctionId) external payable noReentrant {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp < auction.endTime, "Auction already ended");
        require(msg.value > auction.highestBid, "Bid too low");

        // Refund previous bidder
        if (auction.highestBidder != address(0)) {
            pendingReturns[auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = msg.value;
        auction.highestBidder = payable(msg.sender);

        emit BidPlaced(_auctionId, msg.sender, msg.value);
    }

    function withdraw() external noReentrant {
        uint256 amount = pendingReturns[msg.sender];
        require(amount > 0, "Nothing to withdraw");

        pendingReturns[msg.sender] = 0;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "Withdraw failed");
    }

    function endAuction(uint256 _auctionId) external noReentrant {
        Auction storage auction = auctions[_auctionId];
        require(block.timestamp >= auction.endTime, "Auction not ended");
        require(!auction.ended, "Already ended");

        auction.ended = true;

        if (auction.highestBidder != address(0)) {
            IERC721(auction.nftAddress).transferFrom(
                address(this),
                auction.highestBidder,
                auction.tokenId
            );

            auction.charity.transfer(auction.highestBid);

            emit AuctionEnded(
                _auctionId,
                auction.highestBidder,
                auction.highestBid,
                auction.charity
            );
        } else {
            // No bids, return NFT to seller
            IERC721(auction.nftAddress).transferFrom(
                address(this),
                auction.seller,
                auction.tokenId
            );
        }
    }

    function getAuctionDetails(uint256 _auctionId)
        external
        view
        returns (Auction memory)
    {
        return auctions[_auctionId];
    }
}
