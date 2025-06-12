import React, { useState, useEffect } from 'react';
import { BrowserProvider, Contract, JsonRpcSigner } from 'ethers';
import { Users } from 'lucide-react';

const CONTRACT_ADDRESS = "0x431Fb2E732D863934d49ae1e2799E802a9a18e2b";
const CONTRACT_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_description", "type": "string" },
      { "internalType": "string", "name": "_profilePhotoipfsHashCode", "type": "string" },
      { "internalType": "address", "name": "_walletAddress", "type": "address" },
      { "internalType": "uint256", "name": "_timesBorrowed", "type": "uint256" },
      { "internalType": "uint256", "name": "_timesLent", "type": "uint256" },
      { "internalType": "uint256", "name": "_totalCarbonCreditsLent", "type": "uint256" },
      { "internalType": "uint256", "name": "_totalCarbonCreditsBorrowed", "type": "uint256" },
      { "internalType": "uint256", "name": "_totalCarbonCreditsReturned", "type": "uint256" },
      { "internalType": "uint256", "name": "_emissions", "type": "uint256" },
      { "internalType": "uint256", "name": "_reputationScore", "type": "uint256" }
    ],
    "name": "createOrganisation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "addressToOrganisation",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "string", "name": "profilePhotoipfsHashCode", "type": "string" },
      { "internalType": "address", "name": "walletAddress", "type": "address" },
      { "internalType": "uint256", "name": "timesBorrowed", "type": "uint256" },
      { "internalType": "uint256", "name": "timesLent", "type": "uint256" },
      { "internalType": "uint256", "name": "totalCarbonCreditsLent", "type": "uint256" },
      { "internalType": "uint256", "name": "totalCarbonCreditsBorrowed", "type": "uint256" },
      { "internalType": "uint256", "name": "totalCarbonCreditsReturned", "type": "uint256" },
      { "internalType": "uint256", "name": "emissions", "type": "uint256" },
      { "internalType": "uint256", "name": "reputationScore", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // Added new function ABI
  {
    "type": "function",
    "name": "recordOrganisationEmissions",
    "inputs": [
      {
        "name": "_emissions",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
];

export default function Dashboard() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    profilePhoto: null as File | null,
  });
  const [organization, setOrganization] = useState({
    name: '',
    description: '',
    walletAddress: '',
    reputationScore: '0',
    carbonCredits: '0',
    profilePhoto: ''
  });

  // New state for emissions
  const [emissions, setEmissions] = useState('');
  const [isEmissionsLoading, setIsEmissionsLoading] = useState(false);

  useEffect(() => {
    const connectWallet = async () => {
      if (window.ethereum) {
        const prov = new BrowserProvider(window.ethereum);
        const accs = await prov.send("eth_requestAccounts", []);
        const sgnr = await prov.getSigner();
        setAccount(accs[0]);
        setProvider(prov);
        setSigner(sgnr);
        checkRegistration(prov, accs[0]);
      } else {
        alert("Install MetaMask!");
      }
    };

    connectWallet();
  }, []);

  const checkRegistration = async (prov: BrowserProvider, address: string) => {
    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, prov);
      const org = await contract.addressToOrganisation(address);
      if (org.name !== "") {
        setIsRegistered(true);
        setOrganization({
          name: org.name,
          description: org.description,
          walletAddress: address,
          reputationScore: org.reputationScore.toString(),
          carbonCredits: "0",
          profilePhoto: org.profilePhotoipfsHashCode
        });
      }
    } catch (err) {
      console.error("Error checking registration:", err);
    }
  };

  const uploadToIPFS = async (file: File): Promise<string> => {
    return new Promise((res) => {
      setTimeout(() => {
        res("QmMockHash12345");
      }, 1000);
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFormData({ ...formData, profilePhoto: e.target.files[0] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const ipfsHash = formData.profilePhoto
        ? await uploadToIPFS(formData.profilePhoto)
        : "default_hash";

      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer!);
      const tx = await contract.createOrganisation(
        formData.name,
        formData.description,
        ipfsHash,
        account,
        0, 0, 0, 0, 0, 0, 0
      );
      await tx.wait();

      setIsRegistered(true);
      setOrganization({
        name: formData.name,
        description: formData.description,
        walletAddress: account,
        reputationScore: "0",
        carbonCredits: "0",
        profilePhoto: ipfsHash
      });
    } catch (err) {
      console.error("Registration failed:", err);
      alert("Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  // New handler for emissions submission
  const handleEmissionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signer) return alert("Wallet not connected");

    if (!emissions || isNaN(Number(emissions)) || Number(emissions) <= 0) {
      return alert("Please enter a valid emissions number");
    }

    setIsEmissionsLoading(true);
    try {
      const contract = new Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      const tx = await contract.recordOrganisationEmissions(Number(emissions));
      await tx.wait();

      alert("Emissions recorded successfully!");
      setEmissions('');
      // Optionally you could refetch the organization data to update emissions info
    } catch (err) {
      console.error("Failed to record emissions:", err);
      alert("Failed to record emissions.");
    } finally {
      setIsEmissionsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {isRegistered ? (
        <>
          <div className="bg-white p-6 shadow rounded mb-6">
            <h2 className="text-xl font-bold mb-4">Organization Profile</h2>
            <div className="flex items-center space-x-4 mb-4">
              {organization.profilePhoto ? (
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

          {/* New emissions form */}
          <div className="bg-white p-6 shadow rounded">
            <h2 className="text-xl font-bold mb-4">Record Emissions</h2>
            <form onSubmit={handleEmissionsSubmit} className="space-y-4 max-w-sm">
              <div>
                <label className="block text-sm font-medium">Emissions (uint256)</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={emissions}
                  onChange={(e) => setEmissions(e.target.value)}
                  className="w-full p-2 border rounded"
                />
              </div>
              <button
                type="submit"
                disabled={isEmissionsLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                {isEmissionsLoading ? "Recording..." : "Record Emissions"}
              </button>
            </form>
          </div>
        </>
      ) : (
        <div className="bg-white p-6 shadow rounded">
          <h2 className="text-xl font-bold mb-4">Register Your Organization</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border rounded"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Profile Photo (optional)</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              {isLoading ? "Registering..." : "Register"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
