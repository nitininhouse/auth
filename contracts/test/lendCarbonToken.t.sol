// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "forge-std/Test.sol";
import "../src/CarbonToken.sol";
import "../src/CarbonCredits.sol";

import "../src/utils/structs.sol";
contract DummyVerifier {
    function verifyProof(
        uint[2] calldata,
        uint[2][2] calldata, 
        uint[2] calldata,
        uint[] calldata
    ) external pure returns (bool) {
        return true; // Always verify successfully
    }
}
contract CarbonMarketplaceTest is Test {
    CarbonCredit public carbonToken;
    CarbonCreditMarketplace public marketplace;
    
    address public org1 = address(0x1);
    address public org2 = address(0x2);
    address public org3 = address(0x3);
    address dummyVerifier = address(new DummyVerifier());

    uint256 public constant DEMANDED_CREDITS = 1000 ether;
    uint256 public constant LEND_AMOUNT = 500 ether;

    function setUp() public {
        // Deploy contracts
        carbonToken = new CarbonCredit(0); // Start with 0 supply since we'll mint through claims
        marketplace = new CarbonCreditMarketplace(address(carbonToken), address(dummyVerifier));

        // Set up organizations
        vm.startPrank(org1);
        marketplace.createOrganisation(
            "Org 1", 
            "Test Org 1",
            "ipfs1",
            org1,
            0, 0, 0, 0, 0, 0, 0
        );
        vm.stopPrank();

        vm.startPrank(org2);
        marketplace.createOrganisation(
            "Org 2", 
            "Test Org 2",
            "ipfs2",
            org2,
            0, 0, 0, 0, 0, 0, 0
        );
        vm.stopPrank();
    }

    function test_LendRequestFlow() public {
        vm.startPrank(org1);
        marketplace.createClaim(
            DEMANDED_CREDITS,
            block.timestamp + 1 hours,
            "Test claim",
            12345,
            67890,
            new string[](2)
        );
        vm.stopPrank();
        vm.prank(org2);
        marketplace.vote(0, true);
        vm.prank(org3);
        marketplace.vote(0, true);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(org1);
        marketplace.handleVotingResult(0);
        uint256 org1InitialBalance = carbonToken.balanceOf(org1);
        assertEq(org1InitialBalance, DEMANDED_CREDITS, "Org1 should have received claimed tokens");

        // Step 2: Create lend request from org1 to org2
        vm.prank(org2);
        marketplace.createLendRequest(
            org1,
            LEND_AMOUNT,
            5, // 5% interest
            [uint256(2),uint256(2)],
            [[uint256(2), uint256(2)], [uint256(2), uint256(2)]],
            [uint256(1),uint256(1)],
            new uint256[](2)
        );


        // Step 3: Org2 approves the lend request
        vm.prank(org1);
        marketplace.respondToLendRequest(0, 1); // 1 = accept

        // Verify balances after lending
        uint256 org1FinalBalance = carbonToken.balanceOf(org1);
        uint256 org2FinalBalance = carbonToken.balanceOf(org2);

        assertEq(org1FinalBalance, org1InitialBalance - LEND_AMOUNT, "Org1 should have lent tokens");
        assertEq(org2FinalBalance, LEND_AMOUNT, "Org2 should have received lent tokens");

        // Verify organization stats
        Organisation memory org1Details = marketplace.getOrganisationDetails(org1);
        Organisation memory org2Details = marketplace.getOrganisationDetails(org2);

        assertEq(org1Details.totalCarbonCreditsLent, LEND_AMOUNT, "Org1 lending stats should update");
        assertEq(org2Details.totalCarbonCreditsBorrowed, LEND_AMOUNT, "Org2 borrowing stats should update");
        assertEq(org1Details.timesLent, 1, "Org1 times lent should increment");
        assertEq(org2Details.timesBorrowed, 1, "Org2 times borrowed should increment");
    }
}