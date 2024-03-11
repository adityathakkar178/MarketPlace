// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

import "./ERC721.sol";
import "./ERC1155.sol";

contract MarketPlace {
    struct SaleAccount {
        address seller;
        uint256 tokenId;
        uint256 price;
        bool onSale;
    }

    MyERC721 private _erc721Contract;
    MyERC1155 private _erc1155Contract;
    uint256 private _tokenIdCounter;
    mapping (uint256 => SaleAccount) public saleToken;
    mapping (string => bool) private _tokenURIs;

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

    function mintERC1155(uint256 _amount, string memory _tokenURI) public  {
        require(!_tokenURIs[_tokenURI], "URI already exists");
        _tokenURIs[_tokenURI] = true;
        _tokenIdCounter++;
        uint256 tokenId = _tokenIdCounter;
        _erc1155Contract.mint(msg.sender, _amount, _tokenURI, tokenId);
    }

    function sell(uint256 _tokenId, uint256 _price) public {
        // require(_erc721Contract.ownerOf(_tokenId) == msg.sender || _erc1155Contract.balanceOf(msg.sender, _tokenId) > 0, "You don't own this token or have a balance of it");
        require(_price > 0, "Price must be greater than zero");
        saleToken[_tokenId] = SaleAccount(msg.sender, _tokenId, _price, true);  
    }

    function buy(uint256 _tokenId) public payable {
        require(saleToken[_tokenId].onSale, "This token is not for sale");
        require(msg.value == saleToken[_tokenId].price, "Incorrect amount sent");
        if (_erc721Contract.balanceOf(saleToken[_tokenId].seller) > 0) {
            _erc721Contract.trasnferFrom(saleToken[_tokenId].seller, msg.sender, _tokenId);
        } else {
            _erc1155Contract.trasnferFrom(saleToken[_tokenId].seller, msg.sender, saleToken[_tokenId].seller, _tokenId);
        }
        payable(saleToken[_tokenId].seller).transfer(saleToken[_tokenId].price);
        delete saleToken[_tokenId];
    }
}