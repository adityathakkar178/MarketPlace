// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MyERC721 is ERC165, ERC721,  ERC721URIStorage{
    constructor() ERC721("MyToken", "Token") {
        
    }

    function mint(address _owner, string memory _tokenName, string memory _tokenURI, uint256 _tokenId) public {   
        require(bytes(_tokenName).length > 0 && bytes(_tokenURI).length > 0, "Token name, Token id, Token URI can not be empty");     
        uint256 tokenId = _tokenId;
        _mint(_owner, tokenId);
        _setTokenURI(tokenId, _tokenURI);
    }

    function tokenURI(uint256 _tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(_tokenId);
    }

    function trasnferFrom(address _from, address _to, uint256 _tokenId) public {
        _transfer(_from, _to, _tokenId);
    }

    function supportsInterface(bytes4 _interfaceId) public view override(ERC165, ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }
} 