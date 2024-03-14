const { expect } = require('chai');

describe('Mix Marketplace', function () {
    let marketplace;
    let erc721Contract;
    let erc1155Contract;

    beforeEach(async function () {
        const ERC721 = await ethers.getContractFactory('MyERC721');
        erc721Contract = await ERC721.deploy();

        const ERC1155 = await ethers.getContractFactory('MyERC1155');
        erc1155Contract = await ERC1155.deploy();

        const Marketplace = await ethers.getContractFactory('MarketPlace');
        marketplace = await Marketplace.deploy(
            erc721Contract.target,
            erc1155Contract.target
        );
    });

    it('Should deploy contract with ERC721 and ERC1155 contract address', async function () {
        expect(await erc721Contract).to.equal(erc721Contract.target);
        expect(await erc1155Contract).to.equal(erc1155Contract.target);
    });

    it('Should Mint tokens for ERC721', async function () {
        await marketplace.mintERC721('Token Name', 'Token URI');
        const [owner] = await ethers.getSigners();
        const callerBalance = await erc721Contract.balanceOf(owner);
        expect(callerBalance).to.equal(1);
        await expect(
            marketplace.mintERC721('Token name', 'Token URI')
        ).to.be.revertedWith('Token URI already exists');
    });

    it('Should Mint token for ERC1155', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        const [owner] = await ethers.getSigners();
        const callerBalance = await erc1155Contract.balanceOf(owner, 1);
        expect(callerBalance).to.equal(100);
        await expect(
            marketplace.mintERC1155(100, 'Token URI')
        ).to.be.revertedWith('URI already exists');
    });

    it('Should start sale and buy ERC721 tokens', async function () {
        await marketplace.mintERC721('Token Name', 'Token URI');
        // Sell ERC721 token
        await marketplace.sell(1, 100);
        const [tokenSeller, tokenBuyer] = await ethers.getSigners();
        const sales = await marketplace.saleToken(1, tokenSeller.address);
        expect(sales.seller).to.equal(tokenSeller.address);
        expect(sales.tokenId).to.equal(1);
        expect(sales.price).to.equal(100);
        expect(sales.onSale).to.be.true;
        // Buy ERC721 token
        await marketplace
            .connect(tokenBuyer)
            .buy(1, tokenSeller.address, { value: 100 });
        const buyerBalance = await erc721Contract.balanceOf(tokenBuyer.address);
        expect(buyerBalance).to.equal(1);
        const updateSale = await marketplace.saleToken(1, tokenSeller.address);
        expect(updateSale.onSale).to.be.false;
    });

    it('Shoud start sale and buy ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Sell ERC1155 tokens
        await marketplace.sell(1, 100);
        const [tokenSeller, tokenBuyer] = await ethers.getSigners();
        const sales = await marketplace.saleToken(1, tokenSeller.address);
        expect(sales.seller).to.equal(tokenSeller.address);
        expect(sales.tokenId).to.equal(1);
        expect(sales.price).to.equal(100);
        expect(sales.onSale).to.be.true;
        // Buy ERC1155 tokens
        await marketplace
            .connect(tokenBuyer)
            .buy(1, tokenSeller.address, { value: 100 });
        const buyerBalance = await erc1155Contract.balanceOf(
            tokenBuyer.address,
            1
        );
        expect(buyerBalance).to.equal(100);
        const updateSale = await marketplace.saleToken(1, tokenSeller.address);
        expect(updateSale.onSale).to.be.false;
    });

    it('Should start unlimited auction, place bid and accept bid for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token Name', 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place a bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        // Accept bid
        await marketplace.acceptBid(1, bidder.address);
        const balanceOfSeller = await erc721Contract.balanceOf(
            tokenSeller.address
        );
        const balanceOfBidder = await erc721Contract.balanceOf(bidder.address);
        expect(balanceOfSeller).to.equal(0);
        expect(balanceOfBidder).to.equal(1);
        const endAuction = await marketplace.unlimitedAuction(1, tokenSeller);
        expect(endAuction.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(endAuction.tokenId).to.equal(0);
        expect(endAuction.startingPrice).to.equal(0);
    });

    it('Should start unlimited auction, place bid and withdraw bid for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token Name', 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place a bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        // Withdraw bid
        await marketplace.connect(bidder).withdrawBid(1, tokenSeller.address);
        const withdrawBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(withdrawBid).to.be.false;
    });

    it('Should start unlimited auction, place bid and reject bid for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token Name', 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place a bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        // Reject bid
        await marketplace.rejectBid(1, bidder.address);
        const rejectBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(rejectBid).to.be.false;
    });

    it('Should start unlimited auction and withdraw auction if bid has not placed for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token Name', 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Withdraw auction
        await marketplace.withdrawAuction(1);
        const auctionAfterwithdraw = await marketplace.unlimitedAuction(
            1,
            tokenSeller
        );
        expect(auctionAfterwithdraw.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterwithdraw.tokenId).to.equal(0);
        expect(auctionAfterwithdraw.startingPrice).to.equal(0);
    });

    it('Should start unlimited auction and can not withdraw auction if bid has placed', async function () {
        await marketplace.mintERC721('Token name', 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        await expect(marketplace.withdrawAuction(1)).to.be.revertedWith(
            'Cannot withdraw auction once bids have been placed'
        );
    });

    it('Should start unlimited auction, place bid and accept bid for ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start unlimite auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        // Accept bid
        await marketplace.acceptBid(1, bidder.address);
        const balanceOfSeller = await erc1155Contract.balanceOf(
            tokenSeller.address,
            1
        );
        const balanceOfBidder = await erc1155Contract.balanceOf(
            bidder.address,
            1
        );
        expect(balanceOfSeller).to.equal(0);
        expect(balanceOfBidder).to.equal(100);
        const endAuction = await marketplace.unlimitedAuction(1, tokenSeller);
        expect(endAuction.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(endAuction.tokenId).to.equal(0);
        expect(endAuction.startingPrice).to.equal(0);
    });

    it('Should start unlimited auction, place bid and withdraw bid for ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place a bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        // Withdraw bid
        await marketplace.connect(bidder).withdrawBid(1, tokenSeller.address);
        const withdrawBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(withdrawBid).to.be.false;
    });

    it('Should start unlimited auction, place bid and reject bid for ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place a bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        // Reject bid
        await marketplace.rejectBid(1, bidder.address);
        const rejectBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(rejectBid).to.be.false;
    });

    it('Should start unlimited auction and withdraw auction if bid has not placed for ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Withdraw auction
        await marketplace.withdrawAuction(1);
        const auctionAfterwithdraw = await marketplace.unlimitedAuction(
            1,
            tokenSeller
        );
        expect(auctionAfterwithdraw.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterwithdraw.tokenId).to.equal(0);
        expect(auctionAfterwithdraw.startingPrice).to.equal(0);
    });

    it('Should start unlimited auction and can not withdraw auction if bid has placed', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start unlimited auction
        await marketplace.startUnlimitedAuction(1, 100);
        const [tokenSeller, bidder] = await ethers.getSigners();
        const auction = await marketplace.unlimitedAuction(
            1,
            tokenSeller.address
        );
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        // Place bid
        await marketplace
            .connect(bidder)
            .placebid(1, tokenSeller.address, { value: 200 });
        const hasPlaceBid = await marketplace.hasPlacedBid(
            1,
            tokenSeller.address,
            bidder.address
        );
        expect(hasPlaceBid).to.be.true;
        await expect(marketplace.withdrawAuction(1)).to.be.revertedWith(
            'Cannot withdraw auction once bids have been placed'
        );
    });

    it('Should start timed auction and place bid for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token name', 'Token URI');
        // Start auction
        const endTime = Math.floor(Date.now() / 1000) + 3600;
        await marketplace.startTimedAuction(1, 100, endTime);
        const [tokenSeller, bidder1, bidder2] = await ethers.getSigners();
        const auction = await marketplace.timedAuction(1, tokenSeller.address);
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        expect(auction.highestBid).to.equal(0);
        expect(auction.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auction.auctionStartTime).to.be.above(
            Math.floor(Date.now() / 1000)
        );
        expect(auction.auctionEndTime).to.equal(endTime);
        // Place bid with different bidders
        await marketplace
            .connect(bidder1)
            .placeTimedBid(1, tokenSeller.address, { value: 200 });
        await marketplace
            .connect(bidder2)
            .placeTimedBid(1, tokenSeller.address, { value: 2001 });
        const auctionAfterBid = await marketplace.timedAuction(
            1,
            tokenSeller.address
        );
        expect(auctionAfterBid.highestBidder).to.equal(bidder2.address);
    });

    it('Should start timed auction, place bid and claim bid for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token name', 'Token URI');
        // Start auction
        const startTime = Math.floor(Date.now() / 1000) - 3600;
        const endTime = startTime + 3705;
        await marketplace.startTimedAuction(1, 100, endTime);
        const [tokenSeller, bidder1, bidder2] = await ethers.getSigners();
        // Place bid
        await marketplace
            .connect(bidder1)
            .placeTimedBid(1, tokenSeller.address, { value: 200 });
        await marketplace
            .connect(bidder2)
            .placeTimedBid(1, tokenSeller.address, { value: 2001 });
        const auctionAfterBid = await marketplace.timedAuction(
            1,
            tokenSeller.address
        );
        expect(auctionAfterBid.highestBidder).to.equal(bidder2.address);
        // Claim bid
        await marketplace.connect(bidder2).claimBid(1, tokenSeller.address);
        const auctionAfterClaim = await marketplace.timedAuction(
            1,
            tokenSeller.address
        );
        const auction = await marketplace.timedAuction(1, tokenSeller.address);
        expect(auction.tokenId).to.equal(0);
        expect(auction.startingPrice).to.equal(0);
        expect(auctionAfterClaim.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterClaim.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterClaim.highestBid).to.equal(0);
        expect(auction.auctionStartTime).to.equal(0);
        expect(auction.auctionEndTime).to.equal(0);
        const balanceOfSeller = await erc721Contract.balanceOf(
            tokenSeller.address
        );
        const balanceOfBidder = await erc721Contract.balanceOf(bidder2.address);
        expect(balanceOfSeller).to.equal(0);
        expect(balanceOfBidder).to.equal(1);
    });

    it('Should start timed auction and withdraw auction if bid has not placed for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token name', 'Token URI');
        // Start auction
        const endTime = Math.floor(Date.now() / 1000) + 3600;
        await marketplace.startTimedAuction(1, 100, endTime);
        const [tokenSeller] = await ethers.getSigners();
        const auction = await marketplace.timedAuction(1, tokenSeller.address);
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        expect(auction.highestBid).to.equal(0);
        expect(auction.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auction.auctionStartTime).to.be.above(
            Math.floor(Date.now() / 1000)
        );
        expect(auction.auctionEndTime).to.equal(endTime);
        // Cancel Auction
        await marketplace.cancelAuction(1);
        const auctionAfterwithdraw = await marketplace.timedAuction(
            1,
            tokenSeller
        );
        expect(auctionAfterwithdraw.tokenId).to.equal(0);
        expect(auctionAfterwithdraw.startingPrice).to.equal(0);
        expect(auctionAfterwithdraw.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterwithdraw.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterwithdraw.highestBid).to.equal(0);
        expect(auctionAfterwithdraw.auctionStartTime).to.equal(0);
        expect(auctionAfterwithdraw.auctionEndTime).to.equal(0);
    });

    it('Should start timed auction and can not withdraw auction if bid has placed for ERC721 tokens', async function () {
        await marketplace.mintERC721('Token name', 'Token URI');
        // Start auction
        const endTime = Math.floor(Date.now() / 1000) + 3600;
        await marketplace.startTimedAuction(1, 100, endTime);
        const [tokenSeller, bidder1, bidder2] = await ethers.getSigners();
        const auction = await marketplace.timedAuction(1, tokenSeller.address);
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        expect(auction.highestBid).to.equal(0);
        expect(auction.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auction.auctionStartTime).to.be.above(
            Math.floor(Date.now() / 1000)
        );
        expect(auction.auctionEndTime).to.equal(endTime);
        // Place bid with different bidders
        await marketplace
            .connect(bidder1)
            .placeTimedBid(1, tokenSeller.address, { value: 200 });
        await marketplace
            .connect(bidder2)
            .placeTimedBid(1, tokenSeller.address, { value: 2001 });
        const auctionAfterBid = await marketplace.timedAuction(
            1,
            tokenSeller.address
        );
        expect(auctionAfterBid.highestBidder).to.equal(bidder2.address);
        // Cancel auction
        await expect(marketplace.cancelAuction(1)).to.be.revertedWith(
            'Can not withdraw auction once bid has placed'
        );
    });

    it('Should start timed auction, place bid and claim bid for ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start auction
        const startTime = Math.floor(Date.now() / 1000) - 3600;
        const endTime = startTime + 3726;
        await marketplace.startTimedAuction(1, 100, endTime);
        const [tokenSeller, bidder1, bidder2] = await ethers.getSigners();
        // Place bid
        await marketplace
            .connect(bidder1)
            .placeTimedBid(1, tokenSeller.address, { value: 200 });
        await marketplace
            .connect(bidder2)
            .placeTimedBid(1, tokenSeller.address, { value: 2001 });
        const auctionAfterBid = await marketplace.timedAuction(
            1,
            tokenSeller.address
        );
        expect(auctionAfterBid.highestBidder).to.equal(bidder2.address);
        // Claim bid
        await marketplace.connect(bidder2).claimBid(1, tokenSeller.address);
        const auctionAfterClaim = await marketplace.timedAuction(
            1,
            tokenSeller.address
        );
        const auction = await marketplace.timedAuction(1, tokenSeller.address);
        expect(auction.tokenId).to.equal(0);
        expect(auction.startingPrice).to.equal(0);
        expect(auctionAfterClaim.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterClaim.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterClaim.highestBid).to.equal(0);
        expect(auction.auctionStartTime).to.equal(0);
        expect(auction.auctionEndTime).to.equal(0);
        const balanceOfSeller = await erc721Contract.balanceOf(
            tokenSeller.address
        );
        const balanceOfBidder = await erc1155Contract.balanceOf(bidder2.address, 1);
        expect(balanceOfSeller).to.equal(0);
        expect(balanceOfBidder).to.equal(100);
    });

    it('Should start timed auction and withdraw auction if bid has not placed for ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start auction
        const endTime = Math.floor(Date.now() / 1000) + 3600;
        await marketplace.startTimedAuction(1, 100, endTime);
        const [tokenSeller] = await ethers.getSigners();
        const auction = await marketplace.timedAuction(1, tokenSeller.address);
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        expect(auction.highestBid).to.equal(0);
        expect(auction.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auction.auctionStartTime).to.be.above(
            Math.floor(Date.now() / 1000)
        );
        expect(auction.auctionEndTime).to.equal(endTime);
        // Cancel Auction
        await marketplace.cancelAuction(1);
        const auctionAfterwithdraw = await marketplace.timedAuction(
            1,
            tokenSeller
        );
        expect(auctionAfterwithdraw.tokenId).to.equal(0);
        expect(auctionAfterwithdraw.startingPrice).to.equal(0);
        expect(auctionAfterwithdraw.seller).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterwithdraw.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auctionAfterwithdraw.highestBid).to.equal(0);
        expect(auctionAfterwithdraw.auctionStartTime).to.equal(0);
        expect(auctionAfterwithdraw.auctionEndTime).to.equal(0);
    });

    it('Should start timed auction and can not withdraw auction if bid has placed for ERC1155 tokens', async function () {
        await marketplace.mintERC1155(100, 'Token URI');
        // Start auction
        const endTime = Math.floor(Date.now() / 1000) + 3600;
        await marketplace.startTimedAuction(1, 100, endTime);
        const [tokenSeller, bidder1, bidder2] = await ethers.getSigners();
        const auction = await marketplace.timedAuction(1, tokenSeller.address);
        expect(auction.seller).to.equal(tokenSeller.address);
        expect(auction.tokenId).to.equal(1);
        expect(auction.startingPrice).to.equal(100);
        expect(auction.highestBid).to.equal(0);
        expect(auction.highestBidder).to.equal(
            '0x0000000000000000000000000000000000000000'
        );
        expect(auction.auctionStartTime).to.be.above(
            Math.floor(Date.now() / 1000)
        );
        expect(auction.auctionEndTime).to.equal(endTime);
        // Place bid with different bidders
        await marketplace
            .connect(bidder1)
            .placeTimedBid(1, tokenSeller.address, { value: 200 });
        await marketplace
            .connect(bidder2)
            .placeTimedBid(1, tokenSeller.address, { value: 2001 });
        const auctionAfterBid = await marketplace.timedAuction(
            1,
            tokenSeller.address
        );
        expect(auctionAfterBid.highestBidder).to.equal(bidder2.address);
        // Cancel auction
        await expect(marketplace.cancelAuction(1)).to.be.revertedWith(
            'Can not withdraw auction once bid has placed'
        );
    });
});
