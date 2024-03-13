// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

import "./ERC721.sol";
import "./ERC1155.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MarketPlace is ERC165 {
    struct SaleAccount {
        address seller;
        uint256 tokenId;
        uint256 price;
        bool onSale;
    }

    struct Auction {
        address seller;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 auctionStartTime;
    }

    struct TimedAuction {
        address seller;
        uint256 tokenId;
        uint256 startingPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 auctionStartTime;
        uint256 auctionEndTime;
    }

    struct Bid {
        address bidder;
        uint256 biddingPrice;
    }

    MyERC721 private _erc721Contract;
    MyERC1155 private _erc1155Contract;
    uint256 private _tokenIdCounter;
    mapping (string => bool) private _tokenURIs;
    mapping (uint256 => mapping (address => SaleAccount)) public saleToken;
    mapping (uint256 => mapping (address => Auction)) public unlimitedAuction;
    mapping (uint256 => mapping (address => TimedAuction)) public timedAuction;
    mapping (uint256 => mapping (address => Bid[])) public bidders;
    mapping (uint256 => mapping (address => mapping (address => bool))) public hasPlacedBid;

    constructor(address _erc721Address, address _erc1155Address) {
        _erc721Contract = MyERC721(_erc721Address);
        _erc1155Contract = MyERC1155(_erc1155Address);
    }

    function mintERC721(string memory _tokenName, string memory _tokenURI) public {
        require(!_tokenURIs[_tokenURI], "Token URI already exists");
        _tokenURIs[_tokenURI] = true;
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _erc721Contract.mint(msg.sender, _tokenName, _tokenURI, tokenId);
    }

    function mintERC1155(uint256 _amount, string memory _tokenURI) public {
        require(!_tokenURIs[_tokenURI], "URI already exists");
        _tokenURIs[_tokenURI] = true;
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _erc1155Contract.mint(msg.sender, _amount, _tokenURI, tokenId);
    }

    // Buy sell starts here
    function sell(uint256 _tokenId, uint256 _price) public {
        require(_erc1155Contract.balanceOf(msg.sender, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == msg.sender , "You are not the owner of the token");
        require(_price > 0, "Price must be greater than zero");
        saleToken[_tokenId][msg.sender] = SaleAccount(msg.sender, _tokenId, _price, true);  
    }

    function buy(uint256 _tokenId, address _seller) public payable {
        require(saleToken[_tokenId][_seller].onSale, "This token is not for sale");
        require(msg.value == saleToken[_tokenId][_seller].price, "Incorrect amount sent");
        if (_erc721Contract.balanceOf(saleToken[_tokenId][_seller].seller) > 0) {
            _erc721Contract.trasnferFrom(saleToken[_tokenId][_seller].seller, msg.sender, _tokenId);
        } else {
            _erc1155Contract.trasnferFrom(saleToken[_tokenId][_seller].seller, msg.sender, saleToken[_tokenId][_seller].seller, _tokenId);
        }
        payable(saleToken[_tokenId][_seller].seller).transfer(saleToken[_tokenId][_seller].price);
        delete saleToken[_tokenId][_seller];
    }
    // Buy sell ends here

    // Unlimited auction starts here
    function startUnlimitedAuction(uint256 _tokenId, uint256 _price) public {
        require(_erc1155Contract.balanceOf(msg.sender, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == msg.sender , "You are not the owner of this token");
        require(_price > 0, "Price must be greater than zero");
        unlimitedAuction[_tokenId][msg.sender] = Auction(msg.sender, _tokenId, _price, block.timestamp);
    }

    function placebid(uint256 _tokenId, address _seller) public payable {
        require(_erc1155Contract.balanceOf(_seller, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == _seller , "Token Does not exists");
        require(_seller != address(0), "Invalid seller address");
        require(msg.sender != unlimitedAuction[_tokenId][_seller].seller, "Seller can not place bid");
        require(msg.value > unlimitedAuction[_tokenId][_seller].startingPrice, "Bidding price must be greater than current price");
        bidders[_tokenId][_seller].push(Bid(msg.sender, msg.value));
        hasPlacedBid[_tokenId][_seller][msg.sender] = true;
    }

    function acceptBid(uint256 _tokenId, address _bidder) public {
        require(_erc1155Contract.balanceOf(msg.sender, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == msg.sender , "Token Does not exists");
        require(_bidder != address(0), "Invalid bidder address");
        Auction memory auction = unlimitedAuction[_tokenId][msg.sender];
        require(msg.sender == auction.seller, "Only seller can accept a bid");
        require(hasPlacedBid[_tokenId][msg.sender][_bidder], "Bidder has not place a bid");
        Bid[] memory bids = bidders[_tokenId][msg.sender];
        uint256 numBids = bids.length;
        for (uint256 i = 0; i < numBids; i++) {
            if (bids[i].bidder == _bidder) {
                Bid memory selectedBid = bids[i];
                if (_erc721Contract.balanceOf(auction.seller) > 0) {
                    _erc721Contract.trasnferFrom(auction.seller, selectedBid.bidder, _tokenId);
                } else {
                    _erc1155Contract.trasnferFrom(auction.seller, selectedBid.bidder, auction.seller, _tokenId);
                }
                payable(auction.seller).transfer(selectedBid.biddingPrice);
            } else {
                Bid memory remainingBid = bids[i];
                payable(remainingBid.bidder).transfer(remainingBid.biddingPrice);
            }
            delete bidders[_tokenId][msg.sender];
            delete hasPlacedBid[_tokenId][msg.sender][_bidder];
            delete unlimitedAuction[_tokenId][msg.sender];
        }
    }

    function withdrawBid(uint256 _tokenId, address _seller) public {
        require(_erc1155Contract.balanceOf(_seller, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == _seller , "Token Does not exists");
        require(_seller != address(0), "Invalid seller address");
        require(hasPlacedBid[_tokenId][_seller][msg.sender], "You have not placed a bid");
        uint256 numBids = bidders[_tokenId][_seller].length;
        for (uint256 i = 0; i < numBids; i++) {
            if (bidders[_tokenId][_seller][i].bidder == msg.sender) {
                Bid memory withdrawnBid = bidders[_tokenId][_seller][i];                
                payable(msg.sender).transfer(withdrawnBid.biddingPrice);  
                hasPlacedBid[_tokenId][_seller][msg.sender] = false;              
                delete bidders[_tokenId][_seller][i];
                break;
            }
        }
    }

    function rejectBid(uint256 _tokenId, address _bidder) public {
        require(_erc1155Contract.balanceOf(msg.sender, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == msg.sender , "Token Does not exists");
        require(_bidder != address(0), "Invalid bidder address");
        require(msg.sender == unlimitedAuction[_tokenId][msg.sender].seller, "Only seller can reject a bid");
        require(hasPlacedBid[_tokenId][msg.sender][_bidder], "Bidder has not placed a bid");
        Bid[] memory rejectedBid = bidders[_tokenId][msg.sender];
        uint256 numBids = rejectedBid.length;
        for (uint256 i = 0; i < numBids; i++) {
            if (rejectedBid[i].bidder == _bidder) {
                Bid memory selectedBid = rejectedBid[i];
                payable(selectedBid.bidder).transfer(selectedBid.biddingPrice);
                hasPlacedBid[_tokenId][msg.sender][_bidder] = false;
                delete bidders[_tokenId][msg.sender][i];
                break;
            }
        }
    }

    function withdrawAuction(uint256 _tokenId) public {
        require(_erc1155Contract.balanceOf(msg.sender, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == msg.sender , "Token Does not exists");
        require(msg.sender == unlimitedAuction[_tokenId][msg.sender].seller, "Only seller can withdraw auction");
        require(bidders[_tokenId][msg.sender].length == 0, "Cannot withdraw auction once bids have been placed");
        delete unlimitedAuction[_tokenId][msg.sender];
    }
    // Unlimited auction ends here

    //Timed auction starts here
    function startTimedAuction(uint256 _tokenId, uint256 _startingPrice, uint256 _auctionEndTime) public {
        require(_erc1155Contract.balanceOf(msg.sender, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == msg.sender , "You are not the owner of this token");
        require(_startingPrice > 0, "satrting price must be greater than zero");
        require(_auctionEndTime > block.timestamp, "End time must be greater than current time");
        timedAuction[_tokenId][msg.sender] = TimedAuction(msg.sender, _tokenId, _startingPrice, 0, address(0), block.timestamp, _auctionEndTime);
    }

    function placeTimedBid(uint256 _tokenId, address _seller) public payable {
        require(_erc1155Contract.balanceOf(_seller, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == _seller , "Token Does not exists");
        require(_seller != address(0), "Invalid seller address");
        require(block.timestamp <= timedAuction[_tokenId][_seller].auctionEndTime, "Auction has ended");
        require(msg.sender != timedAuction[_tokenId][_seller].seller, "Seller can not place bid");
        require(msg.sender != timedAuction[_tokenId][_seller].highestBidder, "You already have highest bid");
        address currentHighestBidder = timedAuction[_tokenId][_seller].highestBidder;
        uint256 currentHighestBid = timedAuction[_tokenId][_seller].highestBid;
        if (currentHighestBid > 0) {
            require(msg.value > currentHighestBid, "Bid must be greater than previous bid");
            payable(currentHighestBidder).transfer(currentHighestBid);
        } else {
            require(msg.value > timedAuction[_tokenId][_seller].startingPrice, "Bid must be greater than the starting price");
        }
        timedAuction[_tokenId][_seller].highestBid = msg.value;
        timedAuction[_tokenId][_seller].highestBidder = msg.sender;
    }

    function claimBid(uint256 _tokenId, address _seller) public {
        require(_erc1155Contract.balanceOf(_seller, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == _seller , "Token Does not exists");
        require(_seller != address(0), "Invalid seller address");
        require(block.timestamp >= timedAuction[_tokenId][_seller].auctionEndTime, "Auction has not ended yet");
        require(msg.sender == timedAuction[_tokenId][_seller].highestBidder, "Highest bidder can claim token");
        if (_erc721Contract.balanceOf(timedAuction[_tokenId][_seller].seller) > 0) {
            _erc721Contract.trasnferFrom(timedAuction[_tokenId][_seller].seller, msg.sender, _tokenId);
        } else {
            _erc1155Contract.trasnferFrom(timedAuction[_tokenId][_seller].seller, msg.sender, timedAuction[_tokenId][_seller].seller, _tokenId);
        }
        payable(timedAuction[_tokenId][_seller].seller).transfer(timedAuction[_tokenId][_seller].highestBid);
        delete timedAuction[_tokenId][_seller];
    }

    function cancelAuction(uint256 _tokenId) public {
        require(_erc1155Contract.balanceOf(msg.sender, _tokenId) > 0 || _erc721Contract.ownerOf(_tokenId) == msg.sender , "Token Does not exists");
        require(block.timestamp <= timedAuction[_tokenId][msg.sender].auctionEndTime, "Auction has ended");
        require(msg.sender == timedAuction[_tokenId][msg.sender].seller, "only seller can cancel the auction");
        require(timedAuction[_tokenId][msg.sender].highestBidder == address(0), "Can not withdraw auction once bid has placed");
        delete timedAuction[_tokenId][msg.sender];
    }

    function supportsInterface(bytes4 _interfaceId) public view override returns (bool) {
        return super.supportsInterface(_interfaceId);
    }
}