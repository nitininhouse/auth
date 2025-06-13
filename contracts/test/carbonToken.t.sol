// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Test, console} from "forge-std/Test.sol";
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
    address public owner = address(this);
    address dummyVerifier = address(new DummyVerifier());

    uint256 public constant INITIAL_SUPPLY = 1_000_000 ether; // Using ether as 10^18 multiplier
    uint256 public constant DEMANDED_CREDITS = 1000 ether;

    function setUp() public {
        carbonToken = new CarbonCredit(INITIAL_SUPPLY);
        marketplace = new CarbonCreditMarketplace(address(carbonToken), address(dummyVerifier));

        // Set up organizations
        vm.prank(org1);
        marketplace.createOrganisation(
            "Org 1", 
            "Test Org 1",
            "ipfs1",
            org1,
            0, 0, 0, 0, 0, 0, 0
        );

        vm.prank(org2);
        marketplace.createOrganisation(
            "Org 2", 
            "Test Org 2",
            "ipfs2",
            org2,
            0, 0, 0, 0, 0,  0, 0
        );

        vm.prank(org3);
        marketplace.createOrganisation(
            "Org 3", 
            "Test Org 3",
            "ipfs3",
            org3,
            0, 0, 0, 0, 0, 0, 0
        );
    }

    function test_OrganizationCreation() public {
        Organisation memory org = marketplace.getOrganisationDetails(org1);
        assertEq(org.name, "Org 1");
        assertEq(org.walletAddress, org1);
    }

    function test_CreateClaim() public {
        vm.prank(org1);
        marketplace.createClaim(
            DEMANDED_CREDITS,
            block.timestamp + 1 hours,
            "Test claim",
            12345,
            67890,
            new string[](2)
        );

        vm.prank(org1);
        ClaimPublicView memory claim = marketplace.getClaimDetailsPublic(0);
        assertEq(claim.demandedCarbonCredits, DEMANDED_CREDITS);
        assertEq(claim.status, 0); // Pending
    }

    function test_VoteOnClaim() public {
        // Create claim
        vm.prank(org1);
        marketplace.createClaim(
            DEMANDED_CREDITS,
            block.timestamp + 1 hours,
            "Test claim",
            12345,
            67890,
            new string[](2)
        );

        // Org2 votes yes
        vm.prank(org2);
        marketplace.vote(0, true);

        // Org3 votes no
        vm.prank(org3);
        marketplace.vote(0, false);

        vm.prank(org1);

        vm.warp(block.timestamp + 2 hours);
        
        ClaimPublicView memory claim = marketplace.getClaimDetailsPublic(0);
        assertEq(claim.yes_votes, 1);
        assertEq(claim.no_votes, 1);
        assertEq(claim.total_votes, 2);
    }

    function test_TokenDistributionWhenApproved() public {
        // Create claim
        vm.prank(org1);
        marketplace.createClaim(
            DEMANDED_CREDITS,
            block.timestamp + 1 hours,
            "Test claim",
            12345,
            67890,
            new string[](2)
        );
        vm.prank(org2);
        marketplace.vote(0, true);
        vm.prank(org3);
        marketplace.vote(0, true);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(org1);
        marketplace.handleVotingResult(0);
        assertEq(carbonToken.balanceOf(org1), DEMANDED_CREDITS);
        vm.prank(org1);
        ClaimPublicView memory claim = marketplace.getClaimDetailsPublic(0);
        assertEq(claim.status, 1); // Approved
    }


    function test_NoTokenDistributionWhenRejected() public {
        // Create claim
        vm.prank(org1);
        marketplace.createClaim(
            DEMANDED_CREDITS,
            block.timestamp + 1 hours,
            "Test claim",
            12345,
            67890,
            new string[](2)
        );

        // Org2 votes yes, org3 votes no
        vm.prank(org2);
        marketplace.vote(0, true);
        vm.prank(org3);
        marketplace.vote(0, false);
        vm.warp(block.timestamp + 2 hours);
        vm.prank(org1);
        marketplace.handleVotingResult(0);
        assertEq(carbonToken.balanceOf(org1), 0);
        vm.prank(org1);
        ClaimPublicView memory claim = marketplace.getClaimDetailsPublic(0);
        assertEq(uint256(claim.status), 2); // Rejected
    }
}