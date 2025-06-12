import React, { useEffect, useState } from "react";
import { ethers } from "ethers";
import CarbonCreditMarketplaceABI from '../../utils/CarbonCreditMarketplace.json';

// Define types for type safety
interface Claim {
  id: number;
  org: string;
  credits: number;
  votingEnd: number;
  status: number;
  description: string;
  lat: number;
  lng: number;
  proofs: string[];
  yes: number;
  no: number;
  total: number;
}

interface VotedClaims {
  [claimId: number]: boolean;
}

const contractAddress = "0x057cc58159F13833844b7651F8070341FCDba322";

const abi = [
  {
    "type": "function",
    "name": "getClaimDetailsPublic",
    "inputs": [
      {
        "name": "_claimId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct ClaimPublicView",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "organisationAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "demandedCarbonCredits",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "voting_end_time",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "status",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "latitudes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "longitudes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proofIpfsHashCode",
            "type": "string[]",
            "internalType": "string[]"
          },
          {
            "name": "yes_votes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "no_votes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "total_votes",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    type: "function",
    name: "vote",
    inputs: [
      { name: "_claimId", type: "uint256" },
      { name: "_vote", type: "bool" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
];

const MAX_CLAIMS = 50;

const AllClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [votedClaims, setVotedClaims] = useState<VotedClaims>({});
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    // Update current time every second to check voting end status
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const loadClaims = async () => {
      try {
        if (!window.ethereum) throw new Error("MetaMask not found");

        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();
        setAccount(address);

        const contract = new ethers.Contract(contractAddress, CarbonCreditMarketplaceABI.abi, signer);
        const allClaims: Claim[] = [];

        for (let i = 1; i <= MAX_CLAIMS; i++) {
          try {
            const data = await contract.getClaimDetailsPublic(i);
            if (data.id === BigInt(0)) break;

            allClaims.push({
              id: Number(data.id),
              org: data.organisationAddress.toLowerCase(),
              credits: Number(data.demandedCarbonCredits),
              votingEnd: Number(data.voting_end_time),
              status: Number(data.status),
              description: data.description,
              lat: Number(data.latitudes),
              lng: Number(data.longitudes),
              proofs: data.proofIpfsHashCode,
              yes: Number(data.yes_votes),
              no: Number(data.no_votes),
              total: Number(data.total_votes),
            });
          } catch (innerErr) {
            break;
          }
        }

        setClaims(allClaims);
      } catch (err: any) {
        setError(err.message || "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    loadClaims();
  }, []);

  const handleVote = async (claimId: number, voteValue: boolean) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, abi, signer);

      const tx = await contract.vote(claimId, voteValue);
      await tx.wait();

      // Mark as voted locally
      setVotedClaims((prev) => ({ ...prev, [claimId]: true }));

      // Update the UI to reflect new votes
      const updatedClaims = claims.map((claim) =>
        claim.id === claimId
          ? {
              ...claim,
              yes: voteValue ? claim.yes + 1 : claim.yes,
              no: !voteValue ? claim.no + 1 : claim.no,
              total: claim.total + 1,
            }
          : claim
      );
      setClaims(updatedClaims);
    } catch (err: any) {
      alert("Vote failed or already voted.");
    }
  };

  if (loading) return <div className="p-4 text-lg">Loading claims...</div>;
  if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-gray-800 flex items-center border-b pb-4">
        <span className="bg-green-500 w-3 h-8 rounded mr-3"></span>
        Carbon Credit Claims
      </h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-1">
        {claims.map((claim) => {
          const isOrg = account?.toLowerCase() === claim.org;
          const alreadyVoted = votedClaims[claim.id];
          const status = ["Active", "Approved", "Rejected"][claim.status] as "Active" | "Approved" | "Rejected";
          const statusColors: { [key in "Active" | "Approved" | "Rejected"]: string } = {
            "Active": "bg-blue-100 text-blue-800 border-blue-200",
            "Approved": "bg-green-100 text-green-800 border-green-200",
            "Rejected": "bg-red-100 text-red-800 border-red-200"
          };
          const yesPercentage = claim.total > 0 ? (claim.yes / claim.total) * 100 : 0;
          const isVotingEnded = currentTime > claim.votingEnd;

          return (
            <div 
              key={claim.id} 
              className="mb-6 p-6 rounded-lg shadow-md bg-white border-l-4 border-green-400 hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex flex-wrap justify-between items-start mb-3">
                <h2 className="text-xl font-semibold text-gray-800">Claim #{claim.id}</h2>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${statusColors[status]}`}>
                  {status}
                </span>
              </div>
              
              <div className="space-y-3 text-gray-700">
                <p className="font-medium">
                  {claim.description}
                </p>
                
                <div className="grid md:grid-cols-2 gap-x-4 gap-y-2">
                  <div className="flex items-center">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-blue-100 text-blue-600 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v4H7V5zm2 7a1 1 0 11-2 0 1 1 0 012 0zm2 0a1 1 0 11-2 0 1 1 0 012 0zm2 0a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-sm"><strong>Organization:</strong> {claim.org}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100 text-green-600 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-sm"><strong>Carbon Credits:</strong> {claim.credits}</span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-100 text-purple-600 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-sm">
                      <strong>Voting {isVotingEnded ? "Ended" : "Ends"}:</strong>{" "}
                      {new Date(claim.votingEnd * 1000).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="w-5 h-5 flex items-center justify-center rounded-full bg-yellow-100 text-yellow-600 mr-2">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="text-sm"><strong>Location:</strong> ({claim.lat}, {claim.lng})</span>
                  </div>
                </div>
                
                {/* Vote counts and progress bar - only show when voting has ended */}
                {isVotingEnded && (
                  <div className="mt-4">
                    <div className="flex justify-between mb-1 text-sm">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        {claim.yes}
                      </div>
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                        </svg>
                        {claim.no}
                      </div>
                      <span className="text-gray-500">Total: {claim.total}</span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full" 
                        style={{ width: `${yesPercentage}%` }}
                      ></div>
                    </div>
                  </div>
                )}
                
                {/* Show voting buttons only if voting has not ended and user is not the claim creator */}
                {!isVotingEnded && !isOrg ? (
                  <div className="mt-5 flex gap-3">
                    <button
                      onClick={() => handleVote(claim.id, true)}
                      disabled={alreadyVoted}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-white ${
                        alreadyVoted 
                          ? "bg-gray-300 cursor-not-allowed" 
                          : "bg-green-500 hover:bg-green-600 shadow-sm hover:shadow transition-all"
                      }`}
                    >
                      <span className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                        </svg>
                        Vote Yes
                      </span>
                    </button>
                    <button
                      onClick={() => handleVote(claim.id, false)}
                      disabled={alreadyVoted}
                      className={`flex-1 px-4 py-2 rounded-md font-medium text-white ${
                        alreadyVoted 
                          ? "bg-gray-300 cursor-not-allowed" 
                          : "bg-red-500 hover:bg-red-600 shadow-sm hover:shadow transition-all"
                      }`}
                    >
                      <span className="flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                        </svg>
                        Vote No
                      </span>
                    </button>
                  </div>
                ) : isOrg ? (
                  <div className="mt-4 text-sm text-blue-600 bg-blue-50 p-2 rounded flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    You created this claim. Voting disabled.
                  </div>
                ) : (
                  <div className="mt-4 text-sm text-amber-600 bg-amber-50 p-2 rounded flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Voting period has ended. Results are displayed above.
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default AllClaims;