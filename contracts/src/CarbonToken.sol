// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Import OpenZeppelin ERC20 contract
// Fix the import path - use a relative path or proper package import
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract CarbonCredit is ERC20 {
    constructor(uint256 initialSupply) ERC20("Carbon Credit", "CC") {
        _mint(msg.sender, initialSupply * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external {
        _burn(from, amount);
    }
}