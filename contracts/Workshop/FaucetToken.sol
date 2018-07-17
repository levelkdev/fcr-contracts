pragma solidity ^0.4.24;

import "tokens/eip20/EIP20.sol";

contract FaucetToken is EIP20 {

  event Mint(address indexed to, uint256 amount, string data);

  uint public constant MINTING_AMOUNT = 100 * 10 ** 18;

  mapping(address => bool) public tokenRequests;

  modifier canMint() {
    require(!tokenRequests[msg.sender]);
    _;
  }

  function FaucetToken(
    uint256 _initialAmount,
    string _tokenName,
    uint8 _decimalUnits,
    string _tokenSymbol
  ) public EIP20(
    _initialAmount,
    _tokenName,
    _decimalUnits,
    _tokenSymbol
  ) {}

  function gimmeTokens(
    string _data
  )
    canMint
    public
    returns (bool)
  {
    totalSupply = totalSupply + MINTING_AMOUNT;
    balances[msg.sender] = balances[msg.sender] + MINTING_AMOUNT;
    emit Mint(msg.sender, MINTING_AMOUNT, _data);
    emit Transfer(address(0), msg.sender, MINTING_AMOUNT);
    return true;
  }

}
