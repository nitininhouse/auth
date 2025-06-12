import { useState, useEffect, ChangeEvent, DragEvent, FormEvent } from 'react';
import Head from 'next/head';
import { ethers } from 'ethers';
import CarbonCreditMarketplaceABI from '../../utils/CarbonCreditMarketplace.json';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface FormData {
  latitude: string;
  longitude: string;
  votingEndTime: string;
  tokensRequested: string;
  description: string;
  media: File[];
}

function ClaimForm(): JSX.Element {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [contract, setContract] = useState<ethers.Contract | null>(null);
  const [formData, setFormData] = useState<FormData>({
    latitude: '',
    longitude: '',
    votingEndTime: '',
    tokensRequested: '',
    description: '',
    media: []
  });
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const contractAddress = "0x431Fb2E732D863934d49ae1e2799E802a9a18e2b";

  useEffect(() => {
    const checkConnectedWallet = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(newProvider);
          setAccount(accounts[0]);
        }
      }
    };
    checkConnectedWallet();
  }, []);

  useEffect(() => {
    const initializeContract = async () => {
      if (provider && !contract) {
        try {
          const signer = await provider.getSigner();
          const marketplaceContract = new ethers.Contract(
            contractAddress,
            CarbonCreditMarketplaceABI.abi,
            signer
          );
          setContract(marketplaceContract);
        } catch (error) {
          console.error("Failed to initialize contract:", error);
        }
      }
    };

    if (provider) {
      initializeContract();
    }
  }, [provider, contract]);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert('Please install MetaMask');
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    setFormData(prev => ({ ...prev, media: [...prev.media, ...files] }));
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, media: [...prev.media, ...files] }));
    }
  };

  const uploadFilesToIPFS = async (files: File[]): Promise<string[]> => {
    const hashes: string[] = [];
    for (const file of files) {
      try {
        const data = new FormData();
        data.append('file', file);

        const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_PINATA_JWT}`
          },
          body: data
        });

        const json = await res.json();
        hashes.push(json.IpfsHash);
      } catch (err) {
        console.error("IPFS Upload Error:", err);
        throw err;
      }
    }
    return hashes;
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!account) {
      alert("Please connect your wallet.");
      return;
    }
    if (!contract) {
      alert("Smart contract not initialized.");
      return;
    }

    setIsSubmitting(true);

    try {
      const ipfsHashes = await uploadFilesToIPFS(formData.media);

      const tokens = ethers.parseUnits(formData.tokensRequested, 18);
      const votingEndTimestamp = Math.floor(new Date(formData.votingEndTime).getTime() / 1000);
      const latitude = BigInt(Math.floor(Number(formData.latitude) * 1e6));
      const longitude = BigInt(Math.floor(Number(formData.longitude) * 1e6));

      const tx = await contract.createClaim(
        tokens,
        votingEndTimestamp,
        formData.description,
        latitude,
        longitude,
        ipfsHashes
      );

      await tx.wait();
      alert("Claim created successfully!");

      setFormData({
        latitude: '',
        longitude: '',
        votingEndTime: '',
        tokensRequested: '',
        description: '',
        media: []
      });
    } catch (error: any) {
      console.error("Transaction Error:", error);
      alert(`Error: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <Head><title>Create Claim</title></Head>

      <div className="max-w-3xl mx-auto bg-white p-6 shadow-md rounded-md">
        <h1 className="text-2xl font-bold mb-6 text-center">Create Carbon Credit Claim</h1>

        {!account && (
          <div className="text-center mb-4">
            <button onClick={connectWallet} className="bg-blue-600 text-white px-4 py-2 rounded">
              Connect Wallet
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          <label className="block mb-2 font-semibold">Proof Media Upload</label>
          <div
            className={`border-2 border-dashed p-6 rounded text-center mb-4 ${
              isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input type="file" id="media" multiple className="hidden" onChange={handleFileSelect} />
            <label htmlFor="media" className="cursor-pointer text-blue-600">Click or Drag files</label>
          </div>
          {formData.media.length > 0 && (
            <ul className="mb-4 text-sm text-gray-600">
              {formData.media.map((file, i) => (
                <li key={i}>• {file.name}</li>
              ))}
            </ul>
          )}

          <input name="latitude" value={formData.latitude} onChange={handleChange}
            placeholder="Latitude (e.g. 28.6139)" required className="w-full mb-4 p-2 border rounded" />

          <input name="longitude" value={formData.longitude} onChange={handleChange}
            placeholder="Longitude (e.g. 77.2090)" required className="w-full mb-4 p-2 border rounded" />

          <input name="tokensRequested" value={formData.tokensRequested} onChange={handleChange}
            placeholder="Tokens Requested (e.g. 100)" required className="w-full mb-4 p-2 border rounded" />

          <input type="datetime-local" name="votingEndTime" value={formData.votingEndTime}
            onChange={handleChange} required className="w-full mb-4 p-2 border rounded" />

          <textarea name="description" value={formData.description} onChange={handleChange}
            placeholder="Claim Description" required className="w-full mb-4 p-2 border rounded" />

          <button type="submit"
            disabled={isSubmitting}
            className={`w-full py-2 rounded text-white ${isSubmitting ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}>
            {isSubmitting ? "Submitting..." : "Create Claim"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ClaimForm;
