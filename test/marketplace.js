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
});