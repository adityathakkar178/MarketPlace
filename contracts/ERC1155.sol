// SPDX-License-Identifier: MIT
pragma solidity >=0.6.12 <0.9.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/token/ERC1155/extensions/ERC1155URIStorage.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

contract MyERC1155 is ERC165, ERC1155, ERC1155URIStorage{
    constructor() ERC1155("") {
        
    }

    function mint(address _owner, uint256 _amount, string memory _tokenURI, uint256 _tokenId) public {
        require(_amount > 0, "Amount must be grater than zero");
        require(bytes(_tokenURI).length > 0, "TokenURI can not be empty");
        uint256 tokenId = _tokenId;
        _mint(_owner, tokenId, _amount, "");
        _setURI(tokenId, _tokenURI);
    }

    function uri(uint256 tokenId) public view override(ERC1155URIStorage, ERC1155) returns (string memory) {
        return super.uri(tokenId);
    }

    function trasnferFrom(address _from, address _to, address _owner, uint256 _tokenId) public {
        _safeTransferFrom(_from, _to, _tokenId, balanceOf(_owner, _tokenId), "");
    }

    function supportsInterface(bytes4 _interfaceId) public view override(ERC165, ERC1155) returns (bool) {
        return super.supportsInterface(_interfaceId);
    }
}