pragma solidity ^0.4.8;

contract ChallengeInterface {
  /// @dev returns whether challenge is ready for resolutin
  function ended() public view returns (bool);

  /// @dev returns whether challenge has passed
  function passed() public view returns (bool);
}
