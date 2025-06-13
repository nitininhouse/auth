import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useUser, useWallet } from "@civic/auth-web3/react";
import { useAccount, useWriteContract, useReadContract, useBalance } from "wagmi";
import { parseAbi, formatEther } from 'viem';

const CONTRACT_ADDRESS = "0x01ad9Ea4DA34c5386135951a50823eCaC3ec3Ec5" as const;

// Use parseAbi for better type safety
const CONTRACT_ABI = parseAbi([
  'function createOrganisation(string _name, string _description, string _profilePhotoipfsHashCode, address _walletAddress, uint256 _timesBorrowed, uint256 _timesLent, uint256 _totalCarbonCreditsLent, uint256 _totalCarbonCreditsBorrowed, uint256 _totalCarbonCreditsReturned, uint256 _emissions, uint256 _reputationScore)',
  'function addressToOrganisation(address) view returns (string name, string description, string profilePhotoipfsHashCode, address walletAddress, uint256 timesBorrowed, uint256 timesLent, uint256 totalCarbonCreditsLent, uint256 totalCarbonCreditsBorrowed, uint256 totalCarbonCreditsReturned, uint256 emissions, uint256 reputationScore)',
  'function recordOrganisationEmissions(uint256 _emissions)'
]);

// Type definitions
interface OrganizationState {
  name: string;
  description: string;
  walletAddress: string;
  reputationScore: string;
  carbonCredits: string;
  profilePhoto: string;
}

interface FormData {
  name: string;
  description: string;
  profilePhoto: File | null;
}

export default function Dashboard() {
  // Civic hooks
  const userContext = useUser();
  const walletContext = useWallet({ type: 'ethereum' });
  const { address, isConnected } = useAccount();

  // Get wallet balance
  const { data: balance } = useBalance({
    address: address,
  });

  // Wagmi hooks for contract interactions
  const { writeContract: writeCreateOrg, isPending: isCreatingOrg, error: createOrgError } = useWriteContract();
  const { writeContract: writeEmissions, isPending: isRecordingEmissions, error: emissionsError } = useWriteContract();

  // Read contract to check if organization exists
  const { data: organizationData, refetch: refetchOrganization } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'addressToOrganisation',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // State
  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    profilePhoto: null,
  });
  const [organization, setOrganization] = useState<OrganizationState>({
    name: '',
    description: '',
    walletAddress: '',
    reputationScore: '0',
    carbonCredits: '0',
    profilePhoto: ''
  });

  // Emissions state
  const [emissions, setEmissions] = useState<string>('');

  // Check organization registration when data is available
  useEffect(() => {
    if (organizationData && address) {
      const [name, description, profilePhoto, , , , , , , , reputationScore] = organizationData;
      
      if (name && name.trim() !== "") {
        setIsRegistered(true);
        setOrganization({
          name,
          description,
          walletAddress: address,
          reputationScore: reputationScore.toString(),
          carbonCredits: "0",
          profilePhoto
        });
      } else {
        setIsRegistered(false);
      }
    }
  }, [organizationData, address]);

  // Mock IPFS upload function
  const uploadToIPFS = async (file: File): Promise<string> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve("QmMockHash12345");
      }, 1000);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, profilePhoto: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!address) {
      alert("Wallet not connected properly");
      return;
    }

    if (!formData.name.trim() || !formData.description.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    try {
      const ipfsHash: string = formData.profilePhoto
        ? await uploadToIPFS(formData.profilePhoto)
        : "default_hash";

      // Use wagmi's writeContract instead of ethers
      await writeCreateOrg({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createOrganisation',
        args: [
          formData.name,
          formData.description,
          ipfsHash,
          address,
          BigInt(0),
          BigInt(0),
          BigInt(0),
          BigInt(0),
          BigInt(0),
          BigInt(0),
          BigInt(0)
        ],
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        profilePhoto: null
      });

      // Refetch organization data
      setTimeout(() => {
        refetchOrganization();
      }, 2000);

      alert("Organization registration submitted! Please wait for confirmation.");
    } catch (err: any) {
      console.error("Registration failed:", err);
      
      // Handle specific error types
      if (err?.message?.includes('insufficient funds')) {
        alert("Insufficient funds: Your wallet doesn't have enough ETH to pay for gas fees. Please add funds to your wallet and try again.");
      } else if (err?.message?.includes('user rejected')) {
        alert("Transaction was rejected by user.");
      } else {
        alert(`Registration failed: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  const handleEmissionsSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    if (!address) {
      alert("Wallet not connected");
      return;
    }

    if (!emissions || isNaN(Number(emissions)) || Number(emissions) <= 0) {
      alert("Please enter a valid emissions number");
      return;
    }

    try {
      await writeEmissions({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'recordOrganisationEmissions',
        args: [BigInt(emissions)],
      });

      setEmissions('');
      alert("Emissions recording submitted! Please wait for confirmation.");
    } catch (err: any) {
      console.error("Failed to record emissions:", err);
      
      // Handle specific error types
      if (err?.message?.includes('insufficient funds')) {
        alert("Insufficient funds: Your wallet doesn't have enough ETH to pay for gas fees. Please add funds to your wallet and try again.");
      } else if (err?.message?.includes('user rejected')) {
        alert("Transaction was rejected by user.");
      } else {
        alert(`Failed to record emissions: ${err?.message || 'Unknown error'}`);
      }
    }
  };

  // Show error messages if there are contract errors
  useEffect(() => {
    if (createOrgError) {
      console.error("Create organization error:", createOrgError);
    }
  }, [createOrgError]);

  useEffect(() => {
    if (emissionsError) {
      console.error("Emissions error:", emissionsError);
    }
  }, [emissionsError]);

  // Show login prompt if user is not authenticated
  if (!userContext.user) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 shadow rounded text-center">
          <h2 className="text-xl font-bold mb-4">Please Login</h2>
          <p className="text-gray-600 mb-4">You need to login with Civic to access your organization dashboard.</p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if wallet is not connected
  if (!isConnected || !address) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white p-6 shadow rounded text-center">
          <h2 className="text-xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-4">Please connect your embedded wallet to continue.</p>
        </div>
      </div>
    );
  }

  // Show insufficient balance warning
  if (balance && balance.value === BigInt(0)) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 p-6 rounded text-center">
          <h2 className="text-xl font-bold mb-4 text-red-800">Insufficient Balance</h2>
          <p className="text-red-600 mb-4">
            Your wallet balance is 0 ETH. You need ETH to pay for gas fees to interact with the smart contract.
          </p>
          <p className="text-sm text-red-500 mb-4">
            Wallet Address: {address}
          </p>
          <div className="bg-white p-4 rounded border border-red-200">
            <h3 className="font-semibold mb-2">To add funds:</h3>
            <ul className="text-sm text-left space-y-1">
              <li>• Send ETH to your wallet address above</li>
              <li>• Use a faucet if you're on a testnet</li>
              <li>• Transfer from another wallet or exchange</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <section className="relative min-h-screen flex items-center justify-center px-6 md:px-12">
      {/* Background Effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
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
  
      <div className="relative z-10 max-w-7xl mx-auto w-full">
        {isRegistered ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Organization Profile Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30 hover:border-green-400/50 transition-all duration-500">
                <div className="overflow-hidden mb-6">
                  <h2 className="text-3xl md:text-4xl font-black text-white animate-fade-in-up">
                    Organization
                    <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
                      Profile
                    </span>
                  </h2>
                </div>
  
                <div className="flex items-center space-x-6 mb-8">
                  <div className="relative group">
                    {organization.profilePhoto && organization.profilePhoto !== "default_hash" ? (
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-lg opacity-60" />
                        <img
                          src={`https://ipfs.io/ipfs/${organization.profilePhoto}`}
                          alt="Profile"
                          className="relative w-20 h-20 rounded-full object-cover border-2 border-green-400/50"
                        />
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-lg opacity-60" />
                        <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 border-2 border-green-400/50 flex items-center justify-center">
                          <Users className="w-8 h-8 text-green-400" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-2xl font-bold text-white">{organization.name}</h3>
                    <p className="text-green-400 font-mono text-sm bg-green-500/10 px-3 py-1 rounded-full border border-green-500/30">
                      {organization.walletAddress.slice(0, 6)}...{organization.walletAddress.slice(-4)}
                    </p>
                  </div>
                </div>
  
                <div className="space-y-4">
                  <div className="group">
                    <label className="block text-green-400 font-semibold mb-2 text-sm uppercase tracking-wider">
                      Description
                    </label>
                    <p className="text-gray-300 leading-relaxed bg-gray-800/50 p-4 rounded-xl border border-gray-700/50">
                      {organization.description}
                    </p>
                  </div>
                  
                  <div className="group">
                    <label className="block text-green-400 font-semibold mb-2 text-sm uppercase tracking-wider">
                      Reputation Score
                    </label>
                    <div className="bg-gradient-to-r from-green-600/20 to-emerald-600/20 p-4 rounded-xl border border-green-500/30">
                      <span className="text-3xl font-black bg-gradient-to-r from-green-400 to-emerald-400 bg-clip-text text-transparent">
                        {organization.reputationScore}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
  
            {/* Emissions Recording Card */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-600 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30 hover:border-green-400/50 transition-all duration-500">
                <div className="overflow-hidden mb-8">
                  <h2 className="text-3xl md:text-4xl font-black text-white animate-fade-in-up">
                    Record
                    <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
                      Emissions
                    </span>
                  </h2>
                </div>
  
                <form onSubmit={handleEmissionsSubmit} className="space-y-6">
                  <div className="group">
                    <label 
                      htmlFor="emissions" 
                      className="block text-green-400 font-semibold mb-3 text-sm uppercase tracking-wider"
                    >
                      Emissions Amount
                    </label>
                    <div className="relative">
                      <input
                        id="emissions"
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={emissions}
                        onChange={(e) => setEmissions(e.target.value)}
                        className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50"
                        placeholder="Enter emissions amount"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
  
                  <button
                    type="submit"
                    disabled={isRecordingEmissions}
                    className="group relative w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-semibold text-lg overflow-hidden hover:from-green-500 hover:to-emerald-500 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <span className="relative z-10">
                      {isRecordingEmissions ? "Recording..." : "Record Emissions"}
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </button>
                </form>
  
                {emissionsError && (
                  <div className="mt-6 p-4 bg-red-900/50 border border-red-500/30 text-red-300 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                      <span className="font-medium">Error: {emissionsError.message}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-green-500/30 hover:border-green-400/50 transition-all duration-500">
                <div className="overflow-hidden mb-8">
                  <h2 className="text-4xl md:text-5xl font-black text-white animate-fade-in-up text-center">
                    Register Your
                    <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
                      Organization
                    </span>
                  </h2>
                  <p className="text-gray-300 text-center mt-4 text-lg">
                    Join the decentralized carbon credit marketplace
                  </p>
                </div>
  
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="group">
                    <label 
                      htmlFor="orgName" 
                      className="block text-green-400 font-semibold mb-3 text-sm uppercase tracking-wider"
                    >
                      Organization Name
                    </label>
                    <div className="relative">
                      <input
                        id="orgName"
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50"
                        placeholder="Enter organization name"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
  
                  <div className="group">
                    <label 
                      htmlFor="orgDesc" 
                      className="block text-green-400 font-semibold mb-3 text-sm uppercase tracking-wider"
                    >
                      Description
                    </label>
                    <div className="relative">
                      <textarea
                        id="orgDesc"
                        required
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50 resize-none"
                        rows={4}
                        placeholder="Describe your organization's mission and goals"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
  
                  <div className="group">
                    <label 
                      htmlFor="profilePhoto" 
                      className="block text-green-400 font-semibold mb-3 text-sm uppercase tracking-wider"
                    >
                      Profile Photo <span className="text-gray-500 normal-case">(optional)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="profilePhoto"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-green-600 file:text-white hover:file:bg-green-500 file:cursor-pointer cursor-pointer transition-all duration-300 hover:border-green-500/50"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                  </div>
  
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isCreatingOrg}
                      className="group relative w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 rounded-xl text-white font-semibold text-lg overflow-hidden hover:from-green-500 hover:to-emerald-500 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/30 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      <span className="relative z-10">
                        {isCreatingOrg ? "Registering..." : "Register Organization"}
                      </span>
                      <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </button>
                  </div>
                </form>
  
                {createOrgError && (
                  <div className="mt-6 p-4 bg-red-900/50 border border-red-500/30 text-red-300 rounded-xl backdrop-blur-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-red-400 rounded-full animate-pulse" />
                      <span className="font-medium">Error: {createOrgError.message}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  
      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
        
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in-up {
          animation: fade-in-up 0.8s ease-out forwards;
        }
        
        .animation-delay-200 {
          animation-delay: 200ms;
        }
        
        .animation-delay-300 {
          animation-delay: 300ms;
        }
        
        .animation-delay-500 {
          animation-delay: 500ms;
        }
        
        .animation-delay-700 {
          animation-delay: 700ms;
        }
      `}</style>
    </section>
  );
}