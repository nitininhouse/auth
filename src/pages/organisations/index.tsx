import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import { useUser, useWallet } from "@civic/auth-web3/react";
import { useAccount, useWriteContract, useReadContract, useBalance } from "wagmi";
import { parseAbi, formatEther, parseUnits } from 'viem';
import dynamic from 'next/dynamic';

interface Organization {
  name: string;
  description: string;
  profilePhotoipfsHashCode: string;
  totalCarbonCredits: string;
  walletAddress?: string;
  timesLent?: string;
}

interface MyOrganizationDetail {
  name: string;
  description: string;
  profilePhotoipfsHashCode: string;
  walletAddress: string;
  timesBorrowed: string;
  timesLent: string;
  totalCarbonCreditsLent: string;
  totalCarbonCreditsBorrowed: string;
  totalCarbonCreditsReturned: string;
  emissions: string;
  reputationScore: string;
}

const CONTRACT_ADDRESS = '0x01ad9Ea4DA34c5386135951a50823eCaC3ec3Ec5' as const;

// Contract ABI using parseAbi for better type safety
// Update your CONTRACT_ABI in the frontend to match the actual return type

const CONTRACT_ABI = parseAbi([
  
  'function getAllOrganisationDetails() view returns ((string name, string description, string profilePhotoipfsHashCode, uint256 totalCarbonCredits, uint256 timesLent, address walletAddress)[])',
  
  'function getMyOrganisationDetails() view returns (string name, string description, string profilePhotoipfsHashCode, address walletAddress, uint256 timesBorrowed, uint256 timesLent, uint256 totalCarbonCreditsLent, uint256 totalCarbonCreditsBorrowed, uint256 totalCarbonCreditsReturned, uint256 emissions, uint256 reputationScore)',
  'function getBalanceOfOrganisation() view returns (uint256)'
]);

const OrganizationsPage: React.FC = () => {
  // Civic hooks
  const userContext = useUser();
  const walletContext = useWallet({ type: 'ethereum' });
  const { address, isConnected } = useAccount();

  // Get wallet balance
  const { data: balance } = useBalance({
    address: address,
  });

  // Wagmi hooks for contract interactions
  const { writeContract, isPending: isCreatingRequest, error: requestError } = useWriteContract();

  // Read contract data
  const { data: organizationsData, refetch: refetchOrganizations } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getAllOrganisationDetails',
    query: {
      enabled: !!address,
    },
  });

  const { data: myBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getBalanceOfOrganisation',
    query: {
      enabled: !!address,
    },
  });

  const { data: myOrgData, refetch: refetchMyOrg } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getMyOrganisationDetails',
    query: {
      enabled: !!address,
    },
  });

  // Component state
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myOrg, setMyOrg] = useState<MyOrganizationDetail | null>(null);
  const [myOrgCarbonCredits, setMyOrgCarbonCredits] = useState<string | null>(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowRequestAmount, setBorrowRequestAmount] = useState("");
  const [selectedLender, setSelectedLender] = useState<Organization | null>(null);
  const [snarkjsLoaded, setSnarkjsLoaded] = useState(false);

  // Load snarkjs dynamically
  useEffect(() => {
    const loadSnarkjs = async () => {
      try {
        // @ts-ignore
        window.snarkjs = await import('snarkjs');
        setSnarkjsLoaded(true);
        console.log("snarkjs loaded successfully");
      } catch (error) {
        console.error("Failed to load snarkjs:", error);
      }
    };
    
    loadSnarkjs();
  }, []);

  // Process contract data when available
  // Add this debugging code to your useEffect where you process contract data

useEffect(() => {
  if (organizationsData && myBalance !== undefined && myOrgData) {
    try {
      console.log("Raw contract data:");
      console.log("organizationsData:", organizationsData);
      console.log("myOrgData:", myOrgData);
      console.log("myBalance:", myBalance?.toString());
      console.log("Current wallet address:", address);

      // Process organizations data
      const parsedOrgs: Organization[] = Array.isArray(organizationsData)
        ? organizationsData.map((org: any, index: number) => {
            console.log(`Organization ${index}:`, org);
            console.log(`Wallet address: ${org.walletAddress}`);
            console.log(`Is this your org? ${org.walletAddress?.toLowerCase() === address?.toLowerCase()}`);
            
            return {
              name: org.name,
              description: org.description,
              profilePhotoipfsHashCode: org.profilePhotoipfsHashCode,
              totalCarbonCredits: org.totalCarbonCredits.toString(),
              walletAddress: org.walletAddress,
              timesLent: org.timesLent?.toString() || "0",
            };
          })
        : [];

      // Check if your organization is in the list
      const myOrgInList = parsedOrgs.find(org => 
        org.walletAddress?.toLowerCase() === address?.toLowerCase()
      );
      
      console.log("Your organization in list:", myOrgInList);
      console.log("Total organizations found:", parsedOrgs.length);

      // Rest of your existing code...
      const parsedBalance = myBalance?.toString() ?? "0";
      setMyOrgCarbonCredits(parsedBalance);

      const orgData = myOrgData as Partial<MyOrganizationDetail>;
      const myOrgDetail: MyOrganizationDetail = {
        name: orgData.name ?? "",
        description: orgData.description ?? "",
        profilePhotoipfsHashCode: orgData.profilePhotoipfsHashCode ?? "",
        walletAddress: orgData.walletAddress ?? "",
        timesBorrowed: orgData.timesBorrowed ? orgData.timesBorrowed.toString() : "0",
        timesLent: orgData.timesLent ? orgData.timesLent.toString() : "0",
        totalCarbonCreditsLent: orgData.totalCarbonCreditsLent ? orgData.totalCarbonCreditsLent.toString() : "0",
        totalCarbonCreditsBorrowed: orgData.totalCarbonCreditsBorrowed ? orgData.totalCarbonCreditsBorrowed.toString() : "0",
        totalCarbonCreditsReturned: orgData.totalCarbonCreditsReturned ? orgData.totalCarbonCreditsReturned.toString() : "0",
        emissions: orgData.emissions ? orgData.emissions.toString() : "0",
        reputationScore: orgData.reputationScore ? orgData.reputationScore.toString() : "0",
      };
      
      setMyOrg(myOrgDetail);
      setOrganizations(parsedOrgs);
      setLoading(false);
      console.log("Organizations fetched:", parsedOrgs);
    } catch (err) {
      console.error("Error processing contract data:", err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setLoading(false);
    }
  }
}, [organizationsData, myBalance, myOrgData, address]);

  async function calculateProof(lenderOrg: any) {
    try {
      if (!window.snarkjs || !window.snarkjs.groth16) {
        throw new Error("snarkjs is not loaded properly");
      }
      if (!myOrg || !myOrgCarbonCredits) {
        throw new Error("Organization data not loaded");
      }
      
      const offset = Number(myOrg.emissions) - (Number(myOrgCarbonCredits) * 50);

      const input = {
        EXPECTED_MINIMUM_CREDIT_SCORE: 70,
        EXPECTED_MAXIMUM_OFFSET: 10000,
        borrowerTimesRepaid: Number(myOrg.timesBorrowed),
        borrowerOffset: offset,
        borrowerCreditScore: Number(myOrg.reputationScore),
        borrowerTimesLent: Number(myOrg.timesLent),
        borrowerTotalReturned: Number(myOrg.totalCarbonCreditsReturned),
        borrowerRequestAmount: Number(borrowRequestAmount), 
        lenderBalance: Number(lenderOrg.totalCarbonCredits), 
        lenderTimesLent: 7 
      };

      console.log("Generating proof with input:", input);
      const wasmResponse = await fetch('/eligibilityScore.wasm');
      const wasmBuffer = await wasmResponse.arrayBuffer();
      const zkeyResponse = await fetch('/eligibilityScore.zkey');
      const zkeyBuffer = await zkeyResponse.arrayBuffer();
      
      const { proof, publicSignals } = await window.snarkjs.groth16.fullProve(
        input,
        new Uint8Array(wasmBuffer),
        new Uint8Array(zkeyBuffer)
      );
      
      publicSignals[0] = String(Number(publicSignals[0])/Number(Math.pow(10, 40)));
      console.log("Proof generated:", proof);
      console.log("Public signals:", publicSignals);
      alert(`Proof verification result: ${publicSignals}`);
      alert(`Proof: ${JSON.stringify(proof)}`);
      createLendRequest(proof, publicSignals, lenderOrg.walletAddress);

    } catch (error) {
      console.error("Error generating proof:", error);
      alert("Error generating proof. See console for details.");
      return null;
    }
  }

  const createLendRequest = async (proof: any, publicSignals: any, lenderAddress: string) => {
    try {
      if (!address) {
        alert("Wallet not connected");
        return;
      }

      // Convert proof components to correct format
      const a = [BigInt(proof.pi_a[0]), BigInt(proof.pi_a[1])];
      const b = [
        [BigInt(proof.pi_b[0][0]), BigInt(proof.pi_b[0][1])],
        [BigInt(proof.pi_b[1][0]), BigInt(proof.pi_b[1][1])]
      ];
      const c = [BigInt(proof.pi_c[0]), BigInt(proof.pi_c[1])];

      // Convert public signals to BigInts
      const input = (publicSignals as string[]).map((signal: string) => BigInt(signal));

      console.log("Sending data to contract:", {
        lenderAddress,
        carbonCredits: parseUnits(borrowRequestAmount, 0),
        interestRate: 5,
        a,
        b,
        c,
        input
      });

      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createLendRequest',
        args: [
          lenderAddress as `0x${string}`,
          parseUnits(borrowRequestAmount, 0),
          BigInt(5),
          a as [bigint, bigint],
          b as [[bigint, bigint], [bigint, bigint]],
          c as [bigint, bigint],
          input
        ],
      });

      alert("Lend request created successfully!");
      console.log("Transaction submitted");
    } catch (error: any) {
      console.error("Error creating lend request:", error);
      
      if (error?.message?.includes('insufficient funds')) {
        alert("Insufficient funds: Your wallet doesn't have enough ETH to pay for gas fees.");
      } else if (error?.message?.includes('user rejected')) {
        alert("Transaction was rejected by user.");
      } else {
        alert(`Error creating lend request: ${error?.message || 'Unknown error'}`);
      }
    } finally {
      setShowBorrowModal(false);
      setBorrowRequestAmount("");
      setSelectedLender(null);
    }
  };

  const handleBorrowClick = (org: any) => {
    setSelectedLender(org);
    setShowBorrowModal(true);
  };

  const handleSubmitBorrow = () => {
    if (!borrowRequestAmount || isNaN(Number(borrowRequestAmount))) {
      alert("Please enter a valid amount to borrow");
      return;
    }
    
    if (!window.snarkjs || !window.snarkjs.groth16) {
      alert("snarkjs is still loading. Please try again in a moment.");
      return;
    }
    
    if (selectedLender) {
      calculateProof(selectedLender);
    }
  };

  // Show login prompt if user is not authenticated
  if (!userContext.user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-6">
        <div className="relative group max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30" />
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold text-white mb-4">Authentication Required</h2>
            <p className="text-gray-300 mb-6">Please login with Civic to access the organizations marketplace.</p>
            <div className="text-sm text-green-400 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/30">
              Use Civic Auth to continue
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if wallet is not connected
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-6">
        <div className="relative group max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30" />
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold text-white mb-4">Wallet Connection Required</h2>
            <p className="text-gray-300 mb-6">Please connect your Civic embedded wallet to continue.</p>
            <div className="text-sm text-green-400 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/30">
              Connect your wallet through Civic Auth
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show insufficient balance warning
  if (balance && balance.value === BigInt(0)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-6">
        <div className="relative group max-w-2xl w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl blur-3xl opacity-30" />
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-red-500/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">Insufficient Balance</h2>
            <p className="text-gray-300 mb-4">
              Your wallet balance is 0 ETH. You need ETH to pay for gas fees to interact with the smart contract.
            </p>
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700/50 mb-6">
              <p className="text-sm text-gray-400 mb-2">Wallet Address:</p>
              <p className="font-mono text-green-400 text-sm break-all">{address}</p>
            </div>
            <div className="bg-red-900/20 p-4 rounded-xl border border-red-500/30">
              <h3 className="font-semibold text-red-300 mb-2">To add funds:</h3>
              <ul className="text-sm text-gray-300 space-y-1 text-left">
                <li>• Send ETH to your wallet address above</li>
                <li>• Use a faucet if you're on a testnet</li>
                <li>• Transfer from another wallet or exchange</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-400 font-medium">Loading organizations...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-6">
        <div className="relative group max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-orange-600 rounded-3xl blur-3xl opacity-30" />
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-red-500/30 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">❌</span>
            </div>
            <h2 className="text-2xl font-bold text-red-400 mb-4">Error</h2>
            <p className="text-gray-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-green-900/20 via-transparent to-transparent" />
      
      {/* Animated Grid Background */}
      <div className="absolute inset-0 opacity-10">
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: `linear-gradient(rgba(34, 197, 94, 0.1) 1px, transparent 1px),
                             linear-gradient(90deg, rgba(34, 197, 94, 0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
            animation: 'grid-move 20s linear infinite'
          }} 
        />
      </div>

      <main className="relative z-10 p-6 max-w-7xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            Carbon Credit
            <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
              Marketplace
            </span>
          </h1>
          <p className="text-gray-300 text-lg">Browse and connect with eco-friendly organizations</p>
          
          {/* User Info */}
          <div className="mt-6 flex justify-center">
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl px-6 py-3 border border-green-500/30">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-green-400 font-medium">Connected</span>
                </div>
                <div className="text-gray-400">|</div>
                <div className="font-mono text-sm text-gray-300">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </div>
                <div className="text-gray-400">|</div>
                <div className="text-sm text-gray-300">
                  Balance: {balance ? formatEther(balance.value).slice(0, 6) : '0'} ETH
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org, index) => (
            <div key={index} className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600/20 to-emerald-600/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 hover:scale-105">
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 overflow-hidden mr-4 border-2 border-green-500/30">
                    <img
                      src={
                        org.profilePhotoipfsHashCode && org.profilePhotoipfsHashCode !== "default_hash"
                          ? `https://ipfs.io/ipfs/${org.profilePhotoipfsHashCode}`
                          : `https://imgs.search.brave.com/PixY8_zgl8cU1m2y47bf0V-2jOluOmEHOR4564ScsUA/rs:fit:860:0:0:0/g:ce/aHR0cHM6Ly90NC5m/dGNkbi5uZXQvanBn/LzAwLzY0LzY3LzI3/LzM2MF9GXzY0Njcy/NzM2X1U1a3BkR3M5/a2VVbGw4Q1JRM3Az/WWFFdjJNNnFrVlk1/LmpwZw`
                      }
                      alt={org.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-lg">{org.name}</h3>
                    <p className="text-gray-400 text-sm line-clamp-2">{org.description}</p>
                  </div>
                </div>

                <div className="border-t border-gray-700/50 pt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-400 text-sm font-medium">Carbon Credits Available</span>
                    <span className="text-green-400 font-bold text-lg">
                      {(Number(org.totalCarbonCredits) / Math.pow(10, 36)).toFixed(2)}
                    </span>
                  </div>
                  <button 
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 hover:shadow-lg hover:shadow-green-500/30"
                    onClick={() => handleBorrowClick(org)}
                  >
                    Request Loan
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Borrow Modal */}
      {showBorrowModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="relative group max-w-md w-full">
            <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30" />
            <div className="relative bg-gradient-to-br from-gray-800/95 to-gray-900/95 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30">
              <h3 className="text-2xl font-bold text-white mb-6 text-center">
                Request Loan from
                <span className="block text-green-400 mt-1">{selectedLender?.name}</span>
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-green-400 font-semibold mb-3 text-sm uppercase tracking-wider">
                    Loan Amount
                  </label>
                  <input
                    type="number"
                    value={borrowRequestAmount}
                    onChange={(e) => setBorrowRequestAmount(e.target.value)}
                    className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300"
                    placeholder="Enter loan amount"
                  />
                </div>
                
                <div className="flex space-x-4">
                  <button
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-semibold transition-colors duration-300"
                    onClick={() => {
                      setShowBorrowModal(false);
                      setBorrowRequestAmount("");
                      setSelectedLender(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white py-3 rounded-xl font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleSubmitBorrow}
                    disabled={!snarkjsLoaded || isCreatingRequest}
                  >
                    {isCreatingRequest ? "Processing..." : !snarkjsLoaded ? "Loading..." : "Submit Request"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="relative z-10 py-8 text-center text-gray-400 text-sm">
        <div className="max-w-4xl mx-auto px-6">
          <div className="border-t border-gray-800 pt-6">
            © 2025 ZK Carbon Marketplace. All rights reserved.
          </div>
        </div>
      </footer>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  );
};

export default OrganizationsPage;