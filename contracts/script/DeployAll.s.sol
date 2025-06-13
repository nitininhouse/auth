// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {Verifier} from "../src/EligibilityScoreVerifier.sol"; // Changed from EligibilityScoreVerifier to Verifier
import {CarbonCredit} from "../src/CarbonToken.sol";
import {CarbonCreditMarketplace} from "../src/CarbonCredits.sol";

contract DeployAll is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerPrivateKey);
        
        // 1. Deploy Verifier
        Verifier verifier = new Verifier(); // Changed from EligibilityScoreVerifier to Verifier
        console.log("Verifier deployed at:", address(verifier));
        
        // 2. Deploy Token (1 million supply)
        CarbonCredit token = new CarbonCredit(1_000_000 * 10**18);
        console.log("CarbonCredit token deployed at:", address(token));
        
        // 3. Deploy Marketplace
        CarbonCreditMarketplace marketplace = new CarbonCreditMarketplace(
            address(token),
            address(verifier)
        );
        console.log("Marketplace deployed at:", address(marketplace));
        
        // Optional: Mint initial tokens to marketplace
        token.mint(address(marketplace), 500_000 * 10**18);
        
        vm.stopBroadcast();
    }
}