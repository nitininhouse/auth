// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;
struct Organisation {
    string name;
    string description;
    string profilePhotoipfsHashCode;
    address walletAddress;
    uint256 timesBorrowed;
    uint256 timesLent;
    uint256 totalCarbonCreditsLent;
    uint256 totalCarbonCreditsBorrowed;
    uint256 totalCarbonCreditsReturned;
    uint256 emissions;
    uint256 reputationScore;
}

struct LendRequest {
    uint256 id;
    address borrowerAddress;
    address lenderAddress;
    uint256 carbonCredits;
    uint256 response;
    uint256 interestRate;
    uint256 timeOfissue;
    uint256 eligibilityScore;
    bytes proofData;
    uint256 status;
    uint256 recommendation;
    
}

struct Claim {
    uint256 id;
    address organisationAddress;
    uint256 demandedCarbonCredits;
    uint256 voting_end_time;
    uint256 status; // 0 = pending, 1 = accepted, 2 = rejected
    string description;
    uint256 latitudes;
    uint256 longitudes;
    uint256 yes_votes;
    uint256 no_votes;
    uint256 total_votes;
    string[] proofIpfsHashCode;
}

struct ClaimPublicView {
    uint256 id;
    address organisationAddress;
    uint256 demandedCarbonCredits;
    uint256 voting_end_time;
    uint256 status; // 0 = pending, 1 = accepted, 2 = rejected
    string description;
    uint256 latitudes;
    uint256 longitudes;
    string[] proofIpfsHashCode;
    uint256 yes_votes;
    uint256 no_votes;
    uint256 total_votes;
}

struct OrganisationPublicView {
    string name;
    string description;
    string profilePhotoipfsHashCode;
    uint256 totalCarbonCredits;
    uint256 timesLent;
    address walletAddress;

}

// mappings 
// address => userdetails