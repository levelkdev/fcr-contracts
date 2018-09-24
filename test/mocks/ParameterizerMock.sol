pragma solidity ^0.4.24;

import "../../contracts/Parameterizer.sol";

contract ParameterizerMock is Parameterizer {

  function setMockParam(
    string _name,
    uint _value
  )
      public
  {
    set(_name, _value);
  }
}
