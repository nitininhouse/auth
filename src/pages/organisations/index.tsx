import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import dynamic from 'next/dynamic';
import CarbonCreditMarketplaceABI from '../../utils/CarbonCreditMarketplace.json';
// Remove the static import of snarkjs

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

const contractAddress = '0x057cc58159F13833844b7651F8070341FCDba322';

const abi = [
  {
    type: 'function',
    name: 'getAllOrganisationDetails',
    inputs: [],
    outputs: [
      {
        name: '',
        type: 'tuple[]',
        internalType: 'struct OrganisationPublicView[]',
        components: [
          { name: 'name', type: 'string' },
          { name: 'description', type: 'string' },
          { name: 'profilePhotoipfsHashCode', type: 'string' },
          { name: 'totalCarbonCredits', type: 'uint256' },
        ],
      },
    ],
    stateMutability: 'view',
  },
];

const OrganizationsPage: React.FC = () => {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [myOrg, setMyOrg] = useState<MyOrganizationDetail | null>(null);
  const [myOrgCarbonCredits, setMyOrgCarbonCredits] = useState<string | null>(null);
  const [showBorrowModal, setShowBorrowModal] = useState(false);
  const [borrowRequestAmount, setBorrowRequestAmount] = useState("");
  const [selectedLender, setSelectedLender] = useState<Organization | null>(null);
  const [snarkjsLoaded, setSnarkjsLoaded] = useState(false);

  useEffect(() => {
    // Load snarkjs dynamically
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
    
    const fetchOrganizations = async () => {
      try {
        if (!window.ethereum) throw new Error("MetaMask is not installed.");
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const contract = new ethers.Contract(contractAddress, CarbonCreditMarketplaceABI.abi, signer);
        const orgs = await contract.getAllOrganisationDetails();
        const parsedOrgs: Organization[] = orgs.map((org: any) => ({
          name: org.name,
          description: org.description,
          profilePhotoipfsHashCode: org.profilePhotoipfsHashCode,
          totalCarbonCredits: ethers.formatUnits(org.totalCarbonCredits, 0), // or 18 if decimals
        }));

        const balance = await contract.getBalanceOfOrganisation();
        const parsedBalance = ethers.formatUnits(balance, 0); // or 18 if decimals
        setMyOrgCarbonCredits(parsedBalance);

        // Fetching my organization details
        const myOrg = await contract.getMyOrganisationDetails();
        const myOrgDetail = {
          name: myOrg.name,
          description: myOrg.description,
          profilePhotoipfsHashCode: myOrg.profilePhotoipfsHashCode,
          walletAddress: myOrg.walletAddress,
          timesBorrowed: myOrg.timesBorrowed.toString(),
          timesLent: myOrg.timesLent.toString(),
          totalCarbonCreditsLent: ethers.formatUnits(myOrg.totalCarbonCreditsLent, 0),
          totalCarbonCreditsBorrowed: ethers.formatUnits(myOrg.totalCarbonCreditsBorrowed, 0),
          totalCarbonCreditsReturned: ethers.formatUnits(myOrg.totalCarbonCreditsReturned, 0),
          emissions: ethers.formatUnits(myOrg.emissions, 0),
          reputationScore: ethers.formatUnits(myOrg.reputationScore, 0),
        }
        setMyOrg(myOrgDetail);
        setOrganizations(parsedOrgs);
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError('An unknown error occurred');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchOrganizations();
  }, []);

  async function calculateProof(lenderOrg: any) {
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
      createLendRequest(proof, publicSignals, lenderOrg.walletAddress);

    } catch (error) {
      console.error("Error generating proof:", error);
      alert("Error generating proof. See console for details.");
      return null;
    }
  }

  const createLendRequest = async (proof: any, publicSignals: any, lenderAddress: string) => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CarbonCreditMarketplaceABI.abi, signer);
      
      // Structure the proof data correctly
      // Make sure these match the exact structure the contract expects
      const piA = proof.pi_a;
      const piB = proof.pi_b;
      const piC = proof.pi_c;
      
      // Convert public signals to the format expected by the contract
      // Make sure this is an array of the expected length and format
      const formattedPublicSignals = publicSignals.map((signal: any) => 
        typeof signal === 'string' ? signal : signal.toString()
      );
  
      console.log("Sending data to contract:", {
        lenderAddress,
        borrowAmount: ethers.parseUnits(borrowRequestAmount, 0),
        interestRate: 5,
        piA,
        piB,
        piC,
        publicSignals: formattedPublicSignals
      });
      
      const tx = await contract.createLendRequest(
        lenderAddress,
        ethers.parseUnits(borrowRequestAmount, 0),
        5,
        piA,
        piB,
        piC,
        formattedPublicSignals
      );
      
      console.log("Transaction sent:", tx);
      alert("Lend request created successfully! Transaction hash: " + tx.hash);
      await tx.wait();
      console.log("Transaction confirmed");
    }
    catch (error: any) {
      console.error("Error creating lend request:", error);
      
      // More detailed error logging
      if (error.code && error.code === 'UNSUPPORTED_OPERATION') {
        console.error("Fragment matching error - check the data structure being passed");
      
        console.log("Actual parameters:", {
          lenderAddress,
          borrowAmount: borrowRequestAmount,
          proof: proof,
          publicSignals: publicSignals
        });
      }
      
      alert("Error creating lend request. See console for details.");
    } finally {
      setShowBorrowModal(false);
      setBorrowRequestAmount("");
      setSelectedLender(null);
    }
  }
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
      setShowBorrowModal(false);
      setBorrowRequestAmount("");
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Loading...</div>;
  }

  if (error) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center text-red-600">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Organizations</h2>
          <p className="text-gray-600">Browse and support eco-friendly organizations</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {organizations.map((org, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden mr-4">
                  <img
                    src={
                      org.profilePhotoipfsHashCode
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
                  className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded transition-colors"
                  onClick={() => handleBorrowClick(org)}
                >
                  Borrow Money
                </button>
              </div>
            </div>
          ))}
        </div>
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
                }}
              >
                Cancel
              </button>
              <button
                className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
                onClick={handleSubmitBorrow}
                disabled={!snarkjsLoaded}
              >
                {snarkjsLoaded ? "Submit" : "Loading snarkjs..."}
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