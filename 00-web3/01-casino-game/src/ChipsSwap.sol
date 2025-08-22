// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ChipsToken.sol";

contract ChipsSwap {
    ChipsToken public token;
    address public owner;
    uint256 public rate = 1000; // 1 ETH = 1000 CHIPS

    constructor(address tokenAddress) {
        token = ChipsToken(tokenAddress);
        owner = msg.sender;
    }

    function buyChips() external payable {
        uint256 amount = msg.value * rate;
        token.transfer(msg.sender, amount);
    }

    function sellChips(uint256 chipAmount) external {
        uint256 ethAmount = chipAmount / rate;
        require(address(this).balance >= ethAmount, "Not enough ETH");

        token.transferFrom(msg.sender, address(this), chipAmount);
        payable(msg.sender).transfer(ethAmount);
    }

    receive() external payable {}
}