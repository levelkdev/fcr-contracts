pragma solidity ^0.4.8;
import "tokens/eip20/EIP20Interface.sol";
import "zeppelin/math/SafeMath.sol";
import "zeppelin/ownership/Ownable.sol";
import "../ChallengeInterface.sol";

contract OwnableChallenge is Ownable, ChallengeInterface {

  uint TOKEN_LOCK_AMOUNT = 10;

  address public challenger;
  address public listingOwner;
  EIP20Interface public token;

  bool isResolved;
  bool isPassed;
  bool isEnded;

  function OwnableChallenge(address _challenger, address _listingOwner, address _tokenAddr) public {
    challenger = _challenger;
    listingOwner = _listingOwner;
    token = EIP20Interface(_tokenAddr);
  }

  /* ChallengeInterface Functions */

  function passed() public view returns (bool) {
    require(ended());
    return isPassed;
  }

  function ended() view public returns (bool) {
    return isEnded;
  }

  function tokenLockAmount() public view returns (uint) {
    return TOKEN_LOCK_AMOUNT;
  }

  /* Other functions */

  function setEnded() public onlyOwner {
    isEnded = true;
  }

  function resolve(bool _passed) public onlyOwner {
    require(ended() && !isResolved);
    isResolved = true;
    isPassed = _passed;
  }

}
