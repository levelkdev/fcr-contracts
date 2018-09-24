pragma solidity ^0.4.24;

contract FutarchyChallengeMock {
  bool mock_ended;
  bool mock_passed;
  uint mock_winnerRewardAmount;

  function mock_setEnded(bool _ended) public {
    mock_ended = _ended;
  }

  function mock_setPassed(bool _passed) public {
    mock_passed = _passed;
  }

  function mock_setWinnerRewardAmount(uint _winnerRewardAmount) public {
    mock_winnerRewardAmount = _winnerRewardAmount;
  }

  function ended() public view returns (bool) {
    return mock_ended;
  }

  function passed() public view returns (bool) {
    return mock_passed;
  }

  function winnerRewardAmount() public view returns (uint) {
    return mock_winnerRewardAmount;
  }
}
