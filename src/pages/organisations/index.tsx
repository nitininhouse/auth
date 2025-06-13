import React, { useEffect, useState } from 'react';
import { useUser, useWallet } from "@civic/auth-web3/react";
import { useAccount, useWriteContract, useReadContract, useBalance } from "wagmi";
import { parseAbi, formatEther } from 'viem';

const CONTRACT_ADDRESS = "0x057cc58159F13833844b7651F8070341FCDba322" as const;

// Contract ABI using parseAbi for better type safety
const CONTRACT_ABI = parseAbi([
  'function getAllOrganisationDetails() view returns ((string,string,string,uint256)[])',
  'function getMyOrganisationDetails() view returns (string,string,string,address,uint256,uint256,uint256,uint256,uint256,uint256,uint256)',
  'function getBalanceOfOrganisation() view returns (uint256)',
  'function createLendRequest(address lender, uint256 borrowAmount, uint256 interestRate, uint256[2] pA, uint256[2][2] pB, uint256[2] pC, uint256[] _publicSignals)'
]);

interface Organization {
  name: string;
  description: string;
  profilePhotoipfsHashCode: string;
  totalCarbonCredits: string;
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

declare global {
  interface Window {
    snarkjs: any;
  }
}

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
  const { writeContract: writeCreateLendRequest, isPending: isCreatingLendRequest, error: createLendRequestError } = useWriteContract();

  // Read contract data
  const { data: organizationsData, refetch: refetchOrganizations } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getAllOrganisationDetails',
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

  const { data: myOrgBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CONTRACT_ABI,
    functionName: 'getBalanceOfOrganisation',
    query: {
      enabled: !!address,
    },
  });

  // State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
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
        window.snarkjs = await import('snarkjs');
        setSnarkjsLoaded(true);
        console.log("snarkjs loaded successfully");
      } catch (error) {
        console.error("Failed to load snarkjs:", error);
      }
    };
    loadSnarkjs();
  }, []);

  // Process organizations data
  useEffect(() => {
    if (Array.isArray(organizationsData)) {
      const parsedOrgs: Organization[] = organizationsData.map((org: any) => ({
        name: org[0],
        description: org[1],
        profilePhotoipfsHashCode: org[2],
        totalCarbonCredits: org[3].toString()
      }));
      setOrganizations(parsedOrgs);
    } else {
      setOrganizations([]);
    }
  }, [organizationsData]);

  // Process my organization data
  useEffect(() => {
    if (Array.isArray(myOrgData) && myOrgData.length >= 11) {
      const myOrgDetail: MyOrganizationDetail = {
        name: myOrgData[0],
        description: myOrgData[1],
        profilePhotoipfsHashCode: myOrgData[2],
        walletAddress: myOrgData[3],
        timesBorrowed: myOrgData[4].toString(),
        timesLent: myOrgData[5].toString(),
        totalCarbonCreditsLent: myOrgData[6].toString(),
        totalCarbonCreditsBorrowed: myOrgData[7].toString(),
        totalCarbonCreditsReturned: myOrgData[8].toString(),
        emissions: myOrgData[9].toString(),
        reputationScore: myOrgData[10].toString(),
      };
      setMyOrg(myOrgDetail);
    } else {
      setMyOrg(null);
    }
  }, [myOrgData]);

  // Process balance data
  useEffect(() => {
    if (myOrgBalance) {
      setMyOrgCarbonCredits(myOrgBalance.toString());
    }
  }, [myOrgBalance]);

  const calculateProof = async (lenderOrg: Organization) => {
    try {
      // Check if snarkjs is loaded
      if (!window.snarkjs || !window.snarkjs.groth16) {
        throw new Error("snarkjs is not loaded properly");
      }

      // Prepare the input data for the proof
      if (!myOrg || !myOrgCarbonCredits) {
        throw new Error("Organization data not loaded");
      }

      // Calculate the offset (emission - carbonTokenbalance * 50)
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

      await createLendRequest(proof, publicSignals, lenderOrg);
    } catch (error) {
      console.error("Error generating proof:", error);
      alert("Error generating proof. See console for details.");
    }
  };

  const createLendRequest = async (proof: any, publicSignals: any, lenderOrg: Organization) => {
    try {
      if (!address) {
        alert("Wallet not connected");
        return;
      }

      // Structure the proof data correctly
      const piA = proof.pi_a;
      const piB = proof.pi_b;
      const piC = proof.pi_c;

      // Convert public signals to the format expected by the contract
      const formattedPublicSignals = publicSignals.map((signal: any) =>
        typeof signal === 'string' ? signal : signal.toString()
      );

      console.log("Sending data to contract:", {
        lenderAddress: address, // Using the organization's address as lender
        borrowAmount: BigInt(borrowRequestAmount),
        interestRate: 5,
        piA,
        piB,
        piC,
        publicSignals: formattedPublicSignals
      });

      await writeCreateLendRequest({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createLendRequest',
        args: [
          address, // lender address
          BigInt(borrowRequestAmount),
          BigInt(5), // interest rate
          piA,
          piB,
          piC,
          formattedPublicSignals
        ],
      });

      alert("Lend request created successfully!");

      // Reset form
      setShowBorrowModal(false);
      setBorrowRequestAmount("");
      setSelectedLender(null);
    } catch (error: any) {
      console.error("Error creating lend request:", error);

      // Handle specific error types
      if (error?.message?.includes('insufficient funds')) {
        alert("Insufficient funds: Your wallet doesn't have enough ETH to pay for gas fees. Please add funds to your wallet and try again.");
      } else if (error?.message?.includes('user rejected')) {
        alert("Transaction was rejected by user.");
      } else {
        alert(`Failed to create lend request: ${error?.message || 'Unknown error'}`);
      }
    }
  };

  const handleBorrowClick = (org: Organization) => {
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 shadow rounded text-center">
          <h2 className="text-xl font-bold mb-4">Please Login</h2>
          <p className="text-gray-600 mb-4">You need to login with Civic to access the organizations page.</p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if wallet is not connected
  if (!isConnected || !address) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
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
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Organizations</h2>
          <p className="text-gray-600">Browse and support eco-friendly organizations</p>
        </div>

        {/* My Organization Info */}
        {myOrg && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4">My Organization</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p><strong>Name:</strong> {myOrg.name}</p>
                <p><strong>Reputation Score:</strong> {myOrg.reputationScore}</p>
                <p><strong>Carbon Credits Balance:</strong> {myOrgCarbonCredits || '0'}</p>
              </div>
              <div>
                <p><strong>Times Borrowed:</strong> {myOrg.timesBorrowed}</p>
                <p><strong>Times Lent:</strong> {myOrg.timesLent}</p>
                <p><strong>Emissions:</strong> {myOrg.emissions}</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-4">
                  <img
                    src={
                      org.profilePhotoipfsHashCode && org.profilePhotoipfsHashCode !== "default_hash"
                        ? `https://ipfs.io/ipfs/${org.profilePhotoipfsHashCode}`
                        : `https://via.placeholder.com/150?text=${org.name}`
                    }
                    alt={org.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{org.name}</h3>
                  <p className="text-gray-500 text-sm">{org.description}</p>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600 text-sm">Total Carbon Credits</span>
                  <span className="text-green-600 font-medium">{org.totalCarbonCredits}</span>
                </div>
                <button
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => handleBorrowClick(org)}
                  disabled={isCreatingLendRequest}
                >
                  {isCreatingLendRequest ? "Processing..." : "Borrow Money"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Error display */}
        {createLendRequestError && (
          <div className="mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            Error: {createLendRequestError.message}
          </div>
        )}
      </main>

      {/* Borrow Modal */}
      {showBorrowModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Borrow from {selectedLender?.name}</h3>
            
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="borrowAmount">
                Amount to Borrow:
              </label>
              <input
                id="borrowAmount"
                type="number"
                value={borrowRequestAmount}
                onChange={(e) => setBorrowRequestAmount(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                placeholder="Enter amount"
              />
            </div>

            <div className="flex justify-end space-x-4">
              <button
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                onClick={() => {
                  setShowBorrowModal(false);
                  setBorrowRequestAmount("");
                  setSelectedLender(null);
                }}
              >
                Cancel
              </button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleSubmitBorrow}
                disabled={!snarkjsLoaded || isCreatingLendRequest}
              >
                {!snarkjsLoaded ? "Loading snarkjs..." : isCreatingLendRequest ? "Processing..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="py-6 text-center text-gray-500 text-sm">
        © 2025 EcoLend. All rights reserved.
      </footer>
    </div>
  );
};

export default OrganizationsPage;