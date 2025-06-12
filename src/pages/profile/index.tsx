import React, { useState, useEffect } from 'react';
import { Users } from 'lucide-react';
import { useUser, useWallet } from "@civic/auth-web3/react";
import { useAccount, useWriteContract, useReadContract, useBalance } from "wagmi";
import { parseAbi, formatEther } from 'viem';

const CONTRACT_ADDRESS = "0x057cc58159F13833844b7651F8070341FCDba322" as const;

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
    <div className="p-6 max-w-4xl mx-auto">
      {isRegistered ? (
        <>
          <div className="bg-white p-6 shadow rounded mb-6">
            <h2 className="text-xl font-bold mb-4">Organization Profile</h2>
            <div className="flex items-center space-x-4 mb-4">
              {organization.profilePhoto && organization.profilePhoto !== "default_hash" ? (
                <img
                  src={`https://ipfs.io/ipfs/${organization.profilePhoto}`}
                  alt="Profile"
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-gray-300 flex items-center justify-center">
                  <Users className="w-6 h-6 text-white" />
                </div>
              )}
              <div>
                <p className="font-medium">{organization.name}</p>
                <p className="text-sm text-gray-500">
                  {organization.walletAddress.slice(0, 6)}...{organization.walletAddress.slice(-4)}
                </p>
              </div>
            </div>
            <p className="mb-2"><strong>Description:</strong> {organization.description}</p>
            <p><strong>Reputation Score:</strong> {organization.reputationScore}</p>
          </div>

          <div className="bg-white p-6 shadow rounded">
            <h2 className="text-xl font-bold mb-4">Record Emissions</h2>
            <form onSubmit={handleEmissionsSubmit} className="space-y-4 max-w-sm">
              <div>
                <label htmlFor="emissions" className="block text-sm font-medium mb-1">
                  Emissions Amount
                </label>
                <input
                  id="emissions"
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={emissions}
                  onChange={(e) => setEmissions(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter emissions amount"
                />
              </div>
              <button
                type="submit"
                disabled={isRecordingEmissions}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isRecordingEmissions ? "Recording..." : "Record Emissions"}
              </button>
            </form>
            {emissionsError && (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                Error: {emissionsError.message}
              </div>
            )}
          </div>
        </>
      ) : (
        <div className="bg-white p-6 shadow rounded">
          <h2 className="text-xl font-bold mb-4">Register Your Organization</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="orgName" className="block text-sm font-medium mb-1">
                Organization Name
              </label>
              <input
                id="orgName"
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Enter organization name"
              />
            </div>
            <div>
              <label htmlFor="orgDesc" className="block text-sm font-medium mb-1">
                Description
              </label>
              <textarea
                id="orgDesc"
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
                rows={3}
                placeholder="Describe your organization"
              />
            </div>
            <div>
              <label htmlFor="profilePhoto" className="block text-sm font-medium mb-1">
                Profile Photo (optional)
              </label>
              <input
                id="profilePhoto"
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-2 border border-gray-300 rounded"
              />
            </div>
            <button
              type="submit"
              disabled={isCreatingOrg}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreatingOrg ? "Registering..." : "Register Organization"}
            </button>
          </form>
          {createOrgError && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              Error: {createOrgError.message}
            </div>
          )}
        </div>
      )}
    </div>
  );
}