import React, { useState, useEffect, ChangeEvent, DragEvent, FormEvent } from 'react';
import { useAccount, useWriteContract } from "wagmi";
import { parseAbi } from 'viem';

const CONTRACT_ADDRESS = "0x057cc58159F13833844b7651F8070341FCDba322" as const;

// Contract ABI
const CONTRACT_ABI = parseAbi([
  'function createClaim(uint256 tokens, uint256 votingEndTimestamp, string description, int256 latitude, int256 longitude, string[] ipfsHashes)'
]);

interface FormData {
  latitude: string;
  longitude: string;
  votingEndTime: string;
  tokensRequested: string;
  description: string;
  media: File[];
}

const ClaimForm: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { writeContract, isPending, error } = useWriteContract();

  const [formData, setFormData] = useState<FormData>({
    latitude: '',
    longitude: '',
    votingEndTime: '',
    tokensRequested: '',
    description: '',
    media: []
  });
  const [isDragging, setIsDragging] = useState(false);
  const [mockIpfsHashes, setMockIpfsHashes] = useState<string[]>([]);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

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
    
    // Generate mock IPFS hashes for dropped files
    const newHashes = files.map((file, index) => 
      `QmMockHash${Date.now()}${index}_${file.name.replace(/[^a-zA-Z0-9]/g, '')}`
    );
    setMockIpfsHashes(prev => [...prev, ...newHashes]);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setFormData(prev => ({ ...prev, media: [...prev.media, ...files] }));
      
      // Generate mock IPFS hashes for selected files
      const newHashes = files.map((file, index) => 
        `QmMockHash${Date.now()}${index}_${file.name.replace(/[^a-zA-Z0-9]/g, '')}`
      );
      setMockIpfsHashes(prev => [...prev, ...newHashes]);
    }
  };

  const removeFile = (indexToRemove: number) => {
    setFormData(prev => ({
      ...prev,
      media: prev.media.filter((_, index) => index !== indexToRemove)
    }));
    setMockIpfsHashes(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isConnected || !address) {
      alert("Please connect your wallet.");
      return;
    }

    if (formData.media.length === 0) {
      alert("Please upload at least one proof media file.");
      return;
    }

    try {
      // Convert form data to contract parameters
      const tokens = BigInt(formData.tokensRequested) * BigInt(10**18); // Convert to wei
      const votingEndTimestamp = BigInt(Math.floor(new Date(formData.votingEndTime).getTime() / 1000));
      const latitude = BigInt(Math.floor(Number(formData.latitude) * 1e6)); // Convert to micro-degrees
      const longitude = BigInt(Math.floor(Number(formData.longitude) * 1e6)); // Convert to micro-degrees

      console.log("Submitting claim with parameters:", {
        tokens: tokens.toString(),
        votingEndTimestamp: votingEndTimestamp.toString(),
        description: formData.description,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        ipfsHashes: mockIpfsHashes
      });

      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createClaim',
        args: [
          tokens,
          votingEndTimestamp,
          formData.description,
          latitude,
          longitude,
          mockIpfsHashes
        ],
      });

      alert("Claim created successfully!");

      // Reset form
      setFormData({
        latitude: '',
        longitude: '',
        votingEndTime: '',
        tokensRequested: '',
        description: '',
        media: []
      });
      setMockIpfsHashes([]);
    } catch (err) {
      console.error("Transaction Error:", err);
      
      // Ultra-safe error handling
      let errorMessage = "Transaction failed";
      
      if (err) {
        if (typeof err === 'string') {
          errorMessage = err;
        } else {
          // Use Object.prototype.hasOwnProperty for safe property checking
          if (Object.prototype.hasOwnProperty.call(err, 'message') && err.message) {
            errorMessage = String(err.message);
          } else if (Object.prototype.hasOwnProperty.call(err, 'reason') && err.reason) {
            errorMessage = String(err.reason);
          } else if (Object.prototype.hasOwnProperty.call(err, 'shortMessage') && err.shortMessage) {
            errorMessage = String(err.shortMessage);
          } else {
            // Last resort - convert to string safely
            try {
              errorMessage = String(err);
            } catch {
              errorMessage = "Transaction failed - Unknown error";
            }
          }
        }
      }
      
      alert(`Error: ${errorMessage}`);
    }
  };

  // Show loading state during hydration
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 shadow rounded text-center">
          <h2 className="text-xl font-bold mb-4">Loading...</h2>
          <p className="text-gray-600">Please wait while we load the application.</p>
        </div>
      </div>
    );
  }

  // Show wallet connection prompt if not connected
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-6 shadow rounded text-center">
          <h2 className="text-xl font-bold mb-4">Wallet Not Connected</h2>
          <p className="text-gray-600 mb-4">Please connect your wallet to create a carbon credit claim.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto bg-white p-6 shadow-md rounded-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Create Carbon Credit Claim</h1>
        
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-700">
            <strong>Connected Wallet:</strong> {address}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* File Upload Section */}
          <div>
            <label className="block mb-2 font-semibold text-gray-700">Proof Media Upload</label>
            <div
              className={`border-2 border-dashed p-6 rounded text-center transition-colors ${
                isDragging ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <input 
                type="file" 
                id="media" 
                multiple 
                className="hidden" 
                onChange={handleFileSelect}
                accept="image/*,video/*,.pdf"
              />
              <label htmlFor="media" className="cursor-pointer">
                <div className="flex flex-col items-center space-y-2">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-blue-600 hover:text-blue-700">
                    Click here or drag files to upload
                  </span>
                  <span className="text-xs text-gray-500">
                    Images, Videos, PDFs accepted
                  </span>
                </div>
              </label>
            </div>
            
            {formData.media.length > 0 && (
              <div className="mt-4">
                <h4 className="font-medium text-gray-700 mb-2">Uploaded Files:</h4>
                <ul className="space-y-2">
                  {formData.media.map((file, i) => (
                    <li key={i} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm text-gray-600">• {file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Location Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Latitude</label>
              <input 
                type="number"
                step="any"
                name="latitude" 
                value={formData.latitude} 
                onChange={handleChange}
                placeholder="e.g., 28.6139" 
                required 
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Longitude</label>
              <input 
                type="number"
                step="any"
                name="longitude" 
                value={formData.longitude} 
                onChange={handleChange}
                placeholder="e.g., 77.2090" 
                required 
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Tokens and Voting End Time */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Tokens Requested</label>
              <input 
                type="number"
                name="tokensRequested" 
                value={formData.tokensRequested} 
                onChange={handleChange}
                placeholder="e.g., 100" 
                required 
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label className="block mb-2 font-semibold text-gray-700">Voting End Time</label>
              <input 
                type="datetime-local" 
                name="votingEndTime" 
                value={formData.votingEndTime}
                onChange={handleChange} 
                required 
                className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block mb-2 font-semibold text-gray-700">Claim Description</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange}
              placeholder="Describe your carbon credit claim in detail..." 
              required 
              rows={4}
              className="w-full p-3 border border-gray-300 rounded focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <p className="text-red-700">Error: {error.message}</p>
            </div>
          )}

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={isPending || formData.media.length === 0}
            className={`w-full py-3 rounded font-semibold text-white transition-colors ${
              isPending || formData.media.length === 0
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
            }`}
          >
            {isPending ? "Creating Claim..." : "Create Claim"}
          </button>
        </form>

        {/* Info Section */}
        <div className="mt-8 p-4 bg-gray-50 rounded">
          <h3 className="font-semibold text-gray-800 mb-2">Note:</h3>
          <p className="text-sm text-gray-600">
            This form creates a carbon credit claim on the blockchain. The uploaded files will be processed and stored securely.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ClaimForm;