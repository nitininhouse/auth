import React, { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

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

const contractAddress = "0x01ad9Ea4DA34c5386135951a50823eCaC3ec3Ec5" as `0x${string}`;

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
  {
    type: "function",
    name: "claimCount", 
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
] as const;

const AllClaims = () => {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [votedClaims, setVotedClaims] = useState<VotedClaims>({});
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [votingClaimId, setVotingClaimId] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);
  
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Fix hydration issues by ensuring client-side only rendering for time-sensitive content
  useEffect(() => {
    setIsClient(true);
    setCurrentTime(Math.floor(Date.now() / 1000));
  }, []);

  // Debug function - safe string handling
  const addDebugInfo = (info: string) => {
    const safeInfo = typeof info === 'string' ? info : String(info);
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${timestamp}: ${safeInfo}`);
    setDebugInfo(prev => {
      const newInfo = `${timestamp}: ${safeInfo}`;
      return [...prev.slice(-4), newInfo];
    });
  };

  useEffect(() => {
    if (!isClient) return;
    
    const timer = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [isClient]);

  // Smart claim loading - stop when consecutive claims don't exist
  useEffect(() => {
    if (!isClient) return;
    
    if (!isConnected) {
      setError("Please connect your wallet");
      setLoading(false);
      return;
    }

    const loadAllClaims = async () => {
      setLoading(true);
      setError(null);
      addDebugInfo("Starting to load claims...");
      
      const allClaims: Claim[] = [];
      let consecutiveNotFound = 0;
      const maxConsecutiveNotFound = 3;
      
      try {
        // Dynamic import to avoid SSR issues
        const { createPublicClient, http } = await import('viem');
        const { sepolia } = await import('viem/chains');
        
        const publicClient = createPublicClient({
          chain: sepolia,
          transport: http()
        });

        let claimId = 1;
        const maxClaims = 100;
        
        while (claimId <= maxClaims && consecutiveNotFound < maxConsecutiveNotFound) {
          try {
            addDebugInfo(`Checking claim ${claimId}...`);
            
            const data = await publicClient.readContract({
              address: contractAddress,
              abi,
              functionName: 'getClaimDetailsPublic',
              args: [BigInt(claimId)],
            });

            if (data && data.id !== BigInt(0)) {
              // Safe array handling for proofs
              const proofs = Array.isArray(data.proofIpfsHashCode) 
                ? data.proofIpfsHashCode.map(proof => String(proof || '').trim()).filter(Boolean)
                : [];

              const claim: Claim = {
                id: Number(data.id),
                org: String(data.organisationAddress || '').toLowerCase(),
                credits: Number(data.demandedCarbonCredits) / (10**18),
                votingEnd: Number(data.voting_end_time),
                status: Number(data.status),
                description: String(data.description || '').trim(),
                lat: Number(data.latitudes) / 1e6,
                lng: Number(data.longitudes) / 1e6,
                proofs: proofs,
                yes: Number(data.yes_votes),
                no: Number(data.no_votes),
                total: Number(data.total_votes),
              };

              allClaims.push(claim);
              addDebugInfo(`✅ Loaded claim ${claimId}`);
              consecutiveNotFound = 0;
            } else {
              addDebugInfo(`❌ Claim ${claimId} does not exist`);
              consecutiveNotFound++;
            }
          } catch (claimError: any) {
            const errorMsg = claimError?.message || String(claimError);
            const truncatedError = errorMsg.length > 50 ? errorMsg.substring(0, 50) + '...' : errorMsg;
            addDebugInfo(`❌ Claim ${claimId} error: ${truncatedError}`);
            consecutiveNotFound++;
          }
          
          claimId++;
        }

        addDebugInfo(`🎉 Total claims loaded: ${allClaims.length}`);
        setClaims(allClaims);
        
        if (allClaims.length === 0) {
          setError("No claims found. Make sure you're on the correct network and claims have been created.");
        }
        
      } catch (err: any) {
        const errorMessage = err?.message || String(err) || "Failed to load claims";
        addDebugInfo(`💥 Fatal error: ${errorMessage}`);
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    loadAllClaims();
  }, [isConnected, isClient]);

  const handleVote = async (claimId: number, voteValue: boolean) => {
    if (!isConnected) {
      alert("Please connect your wallet");
      return;
    }

    setVotingClaimId(claimId);

    try {
      writeContract({
        address: contractAddress,
        abi,
        functionName: 'vote',
        args: [BigInt(claimId), voteValue],
      });
    } catch (err: any) {
      const errorMsg = err?.message || String(err) || "Unknown error";
      alert("Vote failed: " + errorMsg);
      setVotingClaimId(null);
    }
  };

  useEffect(() => {
    if (isConfirmed && votingClaimId) {
      setVotedClaims((prev) => ({ ...prev, [votingClaimId]: true }));
      setClaims(prevClaims => 
        prevClaims.map((claim) =>
          claim.id === votingClaimId
            ? { ...claim, total: claim.total + 1 }
            : claim
        )
      );
      setVotingClaimId(null);
    }
  }, [isConfirmed, votingClaimId]);

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
            <p className="text-gray-600">Please connect your wallet to view carbon credit claims.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading claims...</p>
          </div>
          
          {debugInfo.length > 0 && (
            <div className="mt-8 bg-white p-4 rounded-lg shadow">
              <h3 className="font-semibold mb-2">Debug Information:</h3>
              <div className="text-sm text-gray-600 space-y-1 max-h-32 overflow-y-auto">
                {debugInfo.map((info, index) => (
                  <div key={index}>{info}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              <h3 className="font-bold mb-2">Error Loading Claims:</h3>
              <p className="text-sm">{error}</p>
            </div>
            
            <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
              <h4 className="font-semibold mb-2">Tips:</h4>
              <ul className="text-sm text-left space-y-1">
                <li>• Make sure you're connected to the correct network (Sepolia testnet)</li>
                <li>• Verify the contract address is correct</li>
                <li>• Check if any claims have been created</li>
                <li>• Try refreshing the page</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (claims.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">No Claims Found</h2>
            <p className="text-gray-600 mb-4">
              No carbon credit claims have been created yet, or you may be on the wrong network.
            </p>
            
            <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
              <h4 className="font-semibold mb-2">What to check:</h4>
              <ul className="text-sm text-left space-y-1">
                <li>• Ensure you're on the Sepolia testnet</li>
                <li>• Verify claims have been created using the form</li>
                <li>• Check that your wallet is properly connected</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-white mb-6">
            🌱 Carbon Credit Claims
          </h1>
          <p className="text-xl text-gray-400 mb-8">
            Found {claims.length} claim{claims.length !== 1 ? 's' : ''}
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-green-400 to-emerald-400 mx-auto rounded-full" />
        </div>
  
        {/* Claims Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {claims.map((claim, index) => {
            const isOrg = address?.toLowerCase() === claim.org;
            const alreadyVoted = votedClaims[claim.id];
            const status = ["Active", "Approved", "Rejected"][claim.status] as "Active" | "Approved" | "Rejected";
            const statusColors: { [key in "Active" | "Approved" | "Rejected"]: string } = {
              "Active": "bg-blue-500/20 text-blue-300 border-blue-500/30",
              "Approved": "bg-green-500/20 text-green-300 border-green-500/30",
              "Rejected": "bg-red-500/20 text-red-300 border-red-500/30"
            };
            const yesPercentage = claim.total > 0 ? (claim.yes / claim.total) * 100 : 0;
            const isVotingEnded = currentTime > claim.votingEnd;
            const isCurrentlyVoting = votingClaimId === claim.id && (isPending || isConfirming);
  
            return (
              <div 
                key={claim.id} 
                className="group relative bg-gray-800/50 backdrop-blur-sm rounded-2xl border border-gray-700/50 hover:border-green-500/50 transition-all duration-500 hover:shadow-2xl hover:shadow-green-500/10 overflow-hidden"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Glow Effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative z-10 p-8">
                  {/* Header */}
                  <div className="flex justify-between items-start mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      Claim #{claim.id}
                    </h2>
                    <span className={`px-4 py-2 rounded-full text-sm font-medium border backdrop-blur-sm ${statusColors[status]}`}>
                      {status}
                    </span>
                  </div>
                  
                  {/* Description */}
                  <div className="mb-8">
                    <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700/30">
                      <p className="text-gray-300 leading-relaxed text-lg">
                        {claim.description}
                      </p>
                    </div>
                  </div>
                  
                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                    <div className="flex items-center p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">Organization</div>
                        <div className="text-xs text-gray-400 break-all font-mono">{claim.org}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                      <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">Carbon Credits</div>
                        <div className="text-xs text-gray-400">{claim.credits}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                      <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">
                          Voting {isVotingEnded ? "Ended" : "Ends"}
                        </div>
                        <div className="text-xs text-gray-400">
                          {new Date(claim.votingEnd * 1000).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center p-4 bg-gray-900/30 rounded-xl border border-gray-700/30">
                      <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4 shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-white text-sm">Location</div>
                        <div className="text-xs text-gray-400 font-mono">({claim.lat.toFixed(6)}, {claim.lng.toFixed(6)})</div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Voting Results */}
                  {isVotingEnded && (
                    <div className="mb-8 p-6 bg-gray-900/50 rounded-xl border border-gray-700/30">
                      <div className="flex justify-between items-center mb-4">
                        <div className="flex items-center space-x-6">
                          <div className="flex items-center">
                            <span className="w-4 h-4 bg-gradient-to-r from-green-400 to-green-500 rounded-full mr-3 shadow-lg shadow-green-500/30"></span>
                            <span className="text-sm font-semibold text-green-300">Yes: {claim.yes}</span>
                          </div>
                          <div className="flex items-center">
                            <span className="w-4 h-4 bg-gradient-to-r from-red-400 to-red-500 rounded-full mr-3 shadow-lg shadow-red-500/30"></span>
                            <span className="text-sm font-semibold text-red-300">No: {claim.no}</span>
                          </div>
                          <span className="text-sm text-gray-400">Total: {claim.total}</span>
                        </div>
                      </div>
                      
                      <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-1000 ease-out shadow-lg shadow-green-500/50"
                          style={{ width: `${yesPercentage}%` }}
                        ></div>
                      </div>
                      <div className="mt-2 text-right text-sm text-gray-400">
                        {yesPercentage.toFixed(1)}% approval
                      </div>
                    </div>
                  )}
                  
                  {/* Action Buttons */}
                  {!isVotingEnded && !isOrg ? (
                    <div className="flex space-x-4">
                      <button
                        onClick={() => handleVote(claim.id, true)}
                        disabled={alreadyVoted || isCurrentlyVoting}
                        className={`flex-1 px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 ${
                          alreadyVoted || isCurrentlyVoting
                            ? "bg-gray-600/50 cursor-not-allowed border border-gray-600/30" 
                            : "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 shadow-lg hover:shadow-green-500/30 border border-green-500/30 hover:border-green-400/50 transform hover:scale-105"
                        }`}
                      >
                        <span className="flex items-center justify-center">
                          {isCurrentlyVoting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          ) : (
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                          Vote Yes
                        </span>
                      </button>
                      <button
                        onClick={() => handleVote(claim.id, false)}
                        disabled={alreadyVoted || isCurrentlyVoting}
                        className={`flex-1 px-6 py-4 rounded-xl font-semibold text-white transition-all duration-300 ${
                          alreadyVoted || isCurrentlyVoting
                            ? "bg-gray-600/50 cursor-not-allowed border border-gray-600/30" 
                            : "bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-400 hover:to-rose-500 shadow-lg hover:shadow-red-500/30 border border-red-500/30 hover:border-red-400/50 transform hover:scale-105"
                        }`}
                      >
                        <span className="flex items-center justify-center">
                          {isCurrentlyVoting ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                          ) : (
                            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          )}
                          Vote No
                        </span>
                      </button>
                    </div>
                  ) : isOrg ? (
                    <div className="p-4 bg-blue-500/10 rounded-xl border border-blue-500/30 backdrop-blur-sm">
                      <div className="flex items-center text-blue-300">
                        <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">You created this claim. Voting disabled.</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-700/30 rounded-xl border border-gray-600/30 backdrop-blur-sm">
                      <div className="flex items-center text-gray-400">
                        <svg className="w-6 h-6 mr-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                        </svg>
                        <span className="font-semibold">Voting period has ended. Results are displayed above.</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default AllClaims;