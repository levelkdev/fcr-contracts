pragma solidity ^0.4.24;

contract IDutchExchange {
    function getPriceInPastAuction(address token1, address token2, uint auctionIndex) public view returns (uint num, uint den);
    function getAuctionIndex(address token1, address token2) public view returns (uint auctionIndex);
}
