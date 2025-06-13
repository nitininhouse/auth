// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

// Import OpenZeppelin ERC20 contract

import "@openzeppelin/contracts/access/Ownable.sol";
import "./utils/structs.sol";
import "./utils/enum.sol";
import "./CarbonToken.sol";

    interface IVerifier {
        function verifyProof(
            uint[2] calldata,
            uint[2][2] calldata, 
            uint[2] calldata,
            uint[] calldata
        ) external pure returns (bool);
    }

    contract CarbonCreditMarketplace {
        IVerifier public verifier;
        uint256 organisationCounter = 0;
        uint256 claimCounter = 0;
        uint256 lentRequestCounter = 0;
        address public carbonTokenAddress;
        address public verifierProofAddress;
        mapping (address => Organisation) public addressToOrganisation;
        mapping (address => Claim[]) public addressToClaims;
        mapping (address => LendRequest[]) public addressToLendRequests;
        mapping (uint256 => address[]) public claimIdToVoters;
        mapping (uint256 => address[]) public claimIdToVotersYes;
        mapping (uint256 => address[]) public claimIdToVotersNo;
        mapping (uint256 => LendRequest) public lendrequestIdToLendRequest;
        mapping (address => LendRequest[]) public addressToLendRequestsLenderPOV;
        mapping (uint256 => Claim) public claimIdToClaim;
        mapping (uint256 => Organisation) public organisationIDToOrganisation;
        CarbonCredit public carbonToken;

        constructor(address _carbonTokenAddress, address _verifierProofAddress) {
            carbonTokenAddress = _carbonTokenAddress;
            verifierProofAddress = _verifierProofAddress;
            carbonToken = CarbonCredit(_carbonTokenAddress);
            verifier = IVerifier(_verifierProofAddress);
        }
        function createOrganisation(
            string memory _name,
            string memory _description,
            string memory _profilePhotoipfsHashCode,
            address _walletAddress,
            uint256 _timesBorrowed,
            uint256 _timesLent,
            uint256 _totalCarbonCreditsLent,
            uint256 _totalCarbonCreditsBorrowed,
            uint256 _totalCarbonCreditsReturned,
            uint256 _emissions,
            uint256 _reputationScore
        ) public {
            // require(addressToOrganisation[msg.sender].name == "", "Organisation already exists");
            Organisation storage newOrg = addressToOrganisation[msg.sender];
            newOrg.name = _name;
            newOrg.description = _description;
            newOrg.profilePhotoipfsHashCode = _profilePhotoipfsHashCode;
            newOrg.walletAddress = _walletAddress;
            newOrg.timesBorrowed = _timesBorrowed;
            newOrg.timesLent = _timesLent;
            newOrg.totalCarbonCreditsLent = 0;
            newOrg.totalCarbonCreditsBorrowed = 0;
            newOrg.totalCarbonCreditsReturned = 0;
            newOrg.emissions = 0;
            newOrg.reputationScore = 0;
            organisationIDToOrganisation[organisationCounter] = newOrg;
            organisationCounter++;
        }

        function recordOrganisationEmissions(
            uint256 _emissions
        ) public {
            Organisation storage org = addressToOrganisation[msg.sender];
            org.emissions += _emissions;
        }

        function createClaim(
            uint256 _demandedCarbonCredits,
            uint256 _voting_end_time,
            string memory _description,
            uint256 _latitudes,
            uint256 _longitudes,
            string[] memory _proofIpfsHashCode
        ) public {
            Claim storage newClaim = addressToClaims[msg.sender].push();
            newClaim.id = claimCounter;
            newClaim.organisationAddress = msg.sender;
            newClaim.demandedCarbonCredits = _demandedCarbonCredits;
            newClaim.voting_end_time = _voting_end_time;
            newClaim.status = 0; // 0 = pending, 1 = accepted, 2 = rejected
            newClaim.description = _description;
            newClaim.latitudes = _latitudes;
            newClaim.longitudes = _longitudes;
            newClaim.yes_votes = 0;
            newClaim.no_votes = 0;
            newClaim.total_votes = 0;
            newClaim.proofIpfsHashCode = _proofIpfsHashCode;
            claimIdToClaim[claimCounter] = newClaim;
            claimCounter++;
        }

        function vote(
            uint256 _claimId,
            bool _vote
        ) public {
            Claim storage claim = claimIdToClaim[_claimId];
            require(claim.id == _claimId, "Claim not found");
            require(block.timestamp < claim.voting_end_time, "Voting period has ended");
            require(msg.sender != claim.organisationAddress, "Organisation cannot vote on its own claim");
            require(claim.status == 0, "Claim is not pending");
            for (uint256 i = 0; i < claimIdToVoters[_claimId].length; i++) {
                require(claimIdToVoters[_claimId][i] != msg.sender, "You have already voted");
            }
            claimIdToVoters[_claimId].push(msg.sender);
            if(_vote) claimIdToVotersYes[_claimId].push(msg.sender);
            else claimIdToVotersNo[_claimId].push(msg.sender);
            if (_vote) claim.yes_votes++;
            else claim.no_votes++;
            claim.total_votes++;
        }

        function handleVotingResult (
            uint256 _claimId
        ) public {
            Claim storage claim = claimIdToClaim[_claimId];
            require(claim.id == _claimId, "Claim not found");
            require(block.timestamp > claim.voting_end_time, "Voting period has not ended");
            require(claim.status == 0, "Claim is not pending");
            if (claim.yes_votes > claim.no_votes) {
                claim.status = 1; // accepted
                Organisation storage org = addressToOrganisation[claim.organisationAddress];
                carbonToken.mint(claim.organisationAddress, claim.demandedCarbonCredits);
                org.totalCarbonCreditsReturned += claim.demandedCarbonCredits;
                for(uint256 i = 0; i < claimIdToVotersYes[_claimId].length; i++) {
                    Organisation storage voter = addressToOrganisation[claimIdToVotersYes[_claimId][i]];
                    voter.reputationScore += 5;
                }
            } else {
                for(uint256 i = 0; i < claimIdToVotersNo[_claimId].length; i++) {
                    Organisation storage voter = addressToOrganisation[claimIdToVotersNo[_claimId][i]];
                    voter.reputationScore += 5;
                }
                claim.status = 2; // rejected
            }
        }

        function createLendRequest(
            address _lenderAddress,
            uint256 _carbonCredits,
            uint256 _interestRate,
            uint[2] calldata a,
            uint[2][2] calldata b,
            uint[2] calldata c,
            uint[] calldata input
        ) public {
            // 1. Verify proof first
            require(verifier.verifyProof(a, b, c, input), "Invalid proof");
            
            // 2. Extract eligibility score from public inputs
            // (Assuming it's the first public input)
            uint256 eligibilityScore = input[0];
            uint256 reccomendation = input[1];
            bytes memory proofData = abi.encode(a, b, c, input);
            
            // 3. Create the request
            LendRequest storage newRequest = addressToLendRequests[msg.sender].push();
            addressToLendRequestsLenderPOV[_lenderAddress].push(newRequest);
            newRequest.id = lentRequestCounter;
            newRequest.borrowerAddress = msg.sender;
            newRequest.lenderAddress = _lenderAddress;
            newRequest.carbonCredits = _carbonCredits;
            newRequest.response = 0;
            newRequest.interestRate = _interestRate;
            newRequest.timeOfissue = block.timestamp;
            newRequest.eligibilityScore = eligibilityScore; // Set from ZKP!
            newRequest.proofData = proofData; // Or store proof components if needed
            newRequest.status = 0;
            newRequest.recommendation = reccomendation;
            
            lendrequestIdToLendRequest[lentRequestCounter] = newRequest;
            lentRequestCounter++;
        }

        function respondToLendRequest(
            uint256 _requestId,
            uint256 _response
        ) public {
            LendRequest storage request = lendrequestIdToLendRequest[_requestId];
            require(request.id == _requestId, "Request not found");
            require(msg.sender == request.lenderAddress, "Only lender can respond");
            require(request.response == 0, "Request already responded");
            require(_response == 1 || _response == 2, "Invalid response");
            request.response = _response;
            if (_response == 1) {
                Organisation storage borrower = addressToOrganisation[request.borrowerAddress];
                borrower.totalCarbonCreditsBorrowed += request.carbonCredits;
                borrower.timesBorrowed++;
                Organisation storage lender = addressToOrganisation[request.lenderAddress];
                lender.totalCarbonCreditsLent += request.carbonCredits;
                lender.timesLent++;
                carbonToken.mint(request.borrowerAddress,request.carbonCredits);
                carbonToken.burn(request.lenderAddress,request.carbonCredits);
            }
        }

        function paybackLendRequest(
            uint256 _requestId
        ) public {
            LendRequest storage request = lendrequestIdToLendRequest[_requestId];
            uint256 amount = request.carbonCredits;
            require(request.id == _requestId, "Request not found");
            require(msg.sender == request.borrowerAddress, "Only borrower can payback");
            require(request.response == 1, "Request not accepted");
            require(amount <= request.carbonCredits, "Amount exceeds borrowed credits");
            uint256 interest = (request.carbonCredits * request.interestRate) / 100 * (block.timestamp - request.timeOfissue) / 365 days;
            carbonToken.burn(msg.sender,interest);
            carbonToken.mint(request.lenderAddress,interest);
            request.carbonCredits -= interest;
        }
        function getOrganisationDetails(
            address _organisationAddress
        ) public view returns (Organisation memory) {
            return addressToOrganisation[_organisationAddress];
        }
        function getClaimDetailsPublic(
            uint256 _claimId
        ) public view returns (ClaimPublicView memory) {
            Claim storage claim = claimIdToClaim[_claimId];
            require(claim.id == _claimId, "Claim not found");
            uint256 yes_votes = claim.yes_votes;
            uint256 no_votes = claim.no_votes;
            uint256 total_votes = claim.total_votes;
            if (block.timestamp < claim.voting_end_time) {
                yes_votes = 0;
                no_votes = 0;    
                total_votes = 0;
            }
            else {
                yes_votes = claim.yes_votes;
                no_votes = claim.no_votes;
                total_votes = claim.total_votes;
            }
                
            return ClaimPublicView({
                id: claim.id,
                organisationAddress: claim.organisationAddress,
                demandedCarbonCredits: claim.demandedCarbonCredits,
                voting_end_time: claim.voting_end_time,
                status: claim.status,
                description: claim.description,
                latitudes: claim.latitudes,
                longitudes: claim.longitudes,
                proofIpfsHashCode: claim.proofIpfsHashCode,
                yes_votes: yes_votes,
                no_votes: no_votes,
                total_votes: total_votes
            });
        }
        function getClaimsByStatus(uint256 _status) public view returns (ClaimPublicView[] memory) {
            uint256 count = 0;
            for (uint256 i = 0; i < claimCounter; i++) {
                if (claimIdToClaim[i].status == _status) {
                    count++;
                }
            }
            ClaimPublicView[] memory filteredClaims = new ClaimPublicView[](count);
            uint256 index = 0;
            for (uint256 i = 0; i < claimCounter; i++) {
                Claim memory claim = claimIdToClaim[i];
                if (claim.status == _status) {
                    bool showVotes = (block.timestamp > claim.voting_end_time) && (claim.status != 0);
                    
                    filteredClaims[index] = ClaimPublicView({
                        id: claim.id,
                        organisationAddress: claim.organisationAddress,
                        demandedCarbonCredits: claim.demandedCarbonCredits,
                        voting_end_time: claim.voting_end_time,
                        status: claim.status,
                        description: claim.description,
                        latitudes: claim.latitudes,
                        longitudes: claim.longitudes,
                        proofIpfsHashCode: claim.proofIpfsHashCode,
                        yes_votes: showVotes ? claim.yes_votes : 0,
                        no_votes: showVotes ? claim.no_votes : 0,
                        total_votes: showVotes ? claim.total_votes : 0
                    });
                    index++;
                }
            }
            return filteredClaims;
        }



        function updateOrganisationDetails(
            string memory _name,
            string memory _description,
            string memory _profilePhotoipfsHashCode,
            uint256 _totalCarbonCredits
        ) public {
            Organisation storage org = addressToOrganisation[msg.sender];
            org.name = _name;
            org.description = _description;
            org.profilePhotoipfsHashCode = _profilePhotoipfsHashCode;
        }

    function getLendRequestDetails(
        address _borrowerAddress,
        uint256 _requestId
    ) public view returns (LendRequest memory) {
        return addressToLendRequests[_borrowerAddress][_requestId];
    }
    function getBalanceOfOrganisation() public view returns (uint256) {
        return carbonToken.balanceOf(msg.sender);
    }

    function getMyOrganisationDetails() public view returns (Organisation memory) {
        return addressToOrganisation[msg.sender];
    }

    function getAllOrganisationDetails() public view returns (OrganisationPublicView[] memory) {
        OrganisationPublicView[] memory orgs = new OrganisationPublicView[](organisationCounter);
        uint256 count = 0;
        for (uint256 i = 0; i < organisationCounter; i++) {
            Organisation memory org = organisationIDToOrganisation[i];                
            orgs[count] = OrganisationPublicView({
                name: org.name,
                description: org.description,
                profilePhotoipfsHashCode: org.profilePhotoipfsHashCode,
                totalCarbonCredits: carbonToken.balanceOf(org.walletAddress),
                timesLent: org.timesLent,
                walletAddress: org.walletAddress
            });
            count++;
        }
         return orgs;
    }

    function getUserLendRequests() public view returns (LendRequest[] memory) {
        return addressToLendRequests[msg.sender];

    }
    function getUserClaims() public view returns (Claim[] memory) {
        return addressToClaims[msg.sender];
    }
    function getUserLendRequestsLenderPOV() public view returns (LendRequest[] memory) {
        return addressToLendRequestsLenderPOV[msg.sender];
    }
}