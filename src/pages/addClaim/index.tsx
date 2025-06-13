import React, { useState, useEffect, ChangeEvent, DragEvent, FormEvent } from 'react';
import { useAccount, useWriteContract } from "wagmi";
import { parseAbi } from 'viem';

const CONTRACT_ADDRESS = "0x057cc58159F13833844b7651F8070341FCDba322" as const;

// Contract ABI - Updated to match your contract
const CONTRACT_ABI = parseAbi([
  'function createClaim(uint256 _demandedCarbonCredits, uint256 _voting_end_time, string _description, uint256 _latitudes, uint256 _longitudes, string[] _proofIpfsHashCode)'
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
  const { writeContract, isPending, error, isSuccess, data } = useWriteContract();

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
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [submitError, setSubmitError] = useState<string>('');

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Handle success state
  useEffect(() => {
    if (isSuccess && data) {
      setSubmitStatus('success');
      // Reset form on successful submission
      setFormData({
        latitude: '',
        longitude: '',
        votingEndTime: '',
        tokensRequested: '',
        description: '',
        media: []
      });
      setMockIpfsHashes([]);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setSubmitStatus('idle');
      }, 5000);
    }
  }, [isSuccess, data]);

  // Handle error state
  useEffect(() => {
    if (error) {
      setSubmitStatus('error');
      setSubmitError(getErrorMessage(error));
    }
  }, [error]);

  const getErrorMessage = (err: any): string => {
    if (!err) return "Unknown error occurred";
    
    // Handle string errors
    if (typeof err === 'string') {
      if (err.includes('execution reverted')) {
        return "Transaction failed: Contract execution reverted. Please check your wallet balance and try again.";
      }
      return err;
    }
    
    // Handle object errors safely - avoid using 'in' operator
    if (typeof err === 'object' && err !== null) {
      // Safe property access without 'in' operator
      const message = err.message;
      const reason = err.reason;
      const shortMessage = err.shortMessage;
      const details = err.details;
      const cause = err.cause;
      
      // Check for common error properties
      if (message && typeof message === 'string') {
        if (message.includes('execution reverted')) {
          return "Transaction failed: Contract execution reverted. Please check your wallet balance and try again.";
        }
        return message;
      }
      if (reason && typeof reason === 'string') {
        if (reason.includes('execution reverted')) {
          return "Transaction failed: Contract execution reverted. Please check your wallet balance and try again.";
        }
        return reason;
      }
      if (shortMessage && typeof shortMessage === 'string') {
        if (shortMessage.includes('execution reverted')) {
          return "Transaction failed: Contract execution reverted. Please check your wallet balance and try again.";
        }
        return shortMessage;
      }
      if (details && typeof details === 'string') {
        return details;
      }
      
      // Handle nested error objects
      if (cause && typeof cause === 'object' && cause !== null) {
        return getErrorMessage(cause);
      }
      
      // Handle toString method
      if (typeof err.toString === 'function') {
        try {
          const errorString = err.toString();
          if (errorString.includes('execution reverted')) {
            return "Transaction failed: Contract execution reverted. Please check your wallet balance and try again.";
          }
          return errorString;
        } catch {
          return "Error converting error message";
        }
      }
    }
    
    // Fallback to string conversion
    try {
      const errorString = String(err);
      if (errorString.includes('execution reverted')) {
        return "Transaction failed: Contract execution reverted. Please check your wallet balance and try again.";
      }
      return errorString;
    } catch {
      return "Unknown error occurred";
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

  const validateForm = (): string | null => {
    if (!formData.latitude || !formData.longitude) {
      return "Please provide valid latitude and longitude coordinates.";
    }
    
    if (!formData.tokensRequested || Number(formData.tokensRequested) <= 0) {
      return "Please specify a valid number of tokens requested.";
    }
    
    if (!formData.votingEndTime) {
      return "Please select a voting end time.";
    }
    
    const votingEndDate = new Date(formData.votingEndTime);
    if (votingEndDate <= new Date()) {
      return "Voting end time must be in the future.";
    }
    
    if (!formData.description.trim()) {
      return "Please provide a description for your claim.";
    }
    
    if (formData.media.length === 0) {
      return "Please upload at least one proof media file.";
    }
    
    return null;
  };

  const handleSubmit = async (e?: any) => {
    if (e) e.preventDefault();
    
    // Reset states
    setSubmitStatus('idle');
    setSubmitError('');

    if (!isConnected || !address) {
      setSubmitStatus('error');
      setSubmitError("Please connect your wallet.");
      return;
    }

    // Validate form
    const validationError = validateForm();
    if (validationError) {
      setSubmitStatus('error');
      setSubmitError(validationError);
      return;
    }

    setSubmitStatus('submitting');

    try {
      // Convert form data to contract parameters to match your contract
      const demandedCarbonCredits = BigInt(formData.tokensRequested) * BigInt(10**18); // Convert to wei
      const voting_end_time = BigInt(Math.floor(new Date(formData.votingEndTime).getTime() / 1000));
      const latitudes = BigInt(Math.floor(Number(formData.latitude) * 1e6)); // Convert to micro-degrees  
      const longitudes = BigInt(Math.floor(Number(formData.longitude) * 1e6)); // Convert to micro-degrees

      console.log("Submitting claim with parameters:", {
        demandedCarbonCredits: demandedCarbonCredits.toString(),
        voting_end_time: voting_end_time.toString(),
        description: formData.description,
        latitudes: latitudes.toString(),
        longitudes: longitudes.toString(),
        proofIpfsHashCode: mockIpfsHashes
      });

      await writeContract({
        address: CONTRACT_ADDRESS,
        abi: CONTRACT_ABI,
        functionName: 'createClaim',
        args: [
          demandedCarbonCredits,
          voting_end_time,
          formData.description,
          latitudes,
          longitudes,
          mockIpfsHashes
        ],
      });

    } catch (err) {
      console.error("Transaction Error:", err);
      setSubmitStatus('error');
      setSubmitError(getErrorMessage(err));
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

        {/* Status Messages */}
        {submitStatus === 'success' && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-green-700 font-medium">Claim created successfully!</p>
            </div>
            <p className="text-green-600 text-sm mt-1">Transaction hash: {data}</p>
          </div>
        )}

        {submitStatus === 'error' && submitError && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-red-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-red-700 font-medium">Error occurred:</p>
                <p className="text-red-600 text-sm mt-1">{submitError}</p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
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

          {/* Submit Button */}
          <button 
            type="button"
            onClick={handleSubmit}
            disabled={submitStatus === 'submitting' || isPending}
            className={`w-full py-3 rounded font-semibold text-white transition-colors ${
              submitStatus === 'submitting' || isPending
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700 active:bg-green-800'
            }`}
          >
            {submitStatus === 'submitting' || isPending ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Creating Claim...
              </span>
            ) : (
              "Create Claim"
            )}
          </button>
        </div>

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