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
    <section className="relative min-h-screen flex items-center justify-center px-6 md:px-12 py-12">
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
  
      <div className="relative z-10 max-w-4xl mx-auto w-full">
        <div className="relative group">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-500" />
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 md:p-12 border border-green-500/30 hover:border-green-400/50 transition-all duration-500">
            
            {/* Header */}
            <div className="overflow-hidden mb-8 text-center">
              <h1 className="text-4xl md:text-5xl font-black text-white animate-fade-in-up">
                Create Carbon Credit
                <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
                  Claim
                </span>
              </h1>
            </div>
            
            {/* Wallet Info */}
            <div className="mb-8 p-4 bg-gradient-to-r from-blue-600/20 to-blue-500/20 backdrop-blur-sm rounded-xl border border-blue-500/30">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-blue-400 rounded-full animate-pulse"></div>
                <div>
                  <span className="text-blue-300 font-semibold text-sm uppercase tracking-wider">Connected Wallet</span>
                  <p className="text-white font-mono text-sm mt-1">{address}</p>
                </div>
              </div>
            </div>
  
            {/* Status Messages */}
            {submitStatus === 'success' && (
              <div className="mb-8 p-4 bg-gradient-to-r from-green-600/20 to-emerald-600/20 backdrop-blur-sm rounded-xl border border-green-500/30 animate-fade-in-up">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-green-300 font-semibold">Claim created successfully!</p>
                    <p className="text-green-400 text-sm mt-1 font-mono">Transaction hash: {data}</p>
                  </div>
                </div>
              </div>
            )}
  
            {submitStatus === 'error' && submitError && (
              <div className="mb-8 p-4 bg-gradient-to-r from-red-600/20 to-red-500/20 backdrop-blur-sm rounded-xl border border-red-500/30 animate-fade-in-up">
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-red-300 font-semibold">Error occurred:</p>
                    <p className="text-red-400 text-sm mt-1">{submitError}</p>
                  </div>
                </div>
              </div>
            )}
  
            <div className="space-y-8">
              {/* File Upload Section */}
              <div className="group">
                <label className="block mb-4 text-green-400 font-semibold text-sm uppercase tracking-wider">
                  Proof Media Upload
                </label>
                <div
                  className={`relative border-2 border-dashed p-8 rounded-xl text-center transition-all duration-300 ${
                    isDragging 
                      ? 'border-green-400 bg-green-500/10 scale-105' 
                      : 'border-gray-600/50 hover:border-green-500/50 bg-gray-800/30'
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
                    <div className="flex flex-col items-center space-y-4">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full blur-lg opacity-60" />
                        <div className="relative w-16 h-16 bg-gradient-to-br from-gray-700 to-gray-800 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <span className="text-green-400 hover:text-green-300 text-lg font-semibold transition-colors">
                          Click here or drag files to upload
                        </span>
                        <p className="text-gray-400 text-sm">
                          Images, Videos, PDFs accepted
                        </p>
                      </div>
                    </div>
                  </label>
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 to-emerald-500/5 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
                
                {formData.media.length > 0 && (
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                    <h4 className="text-green-400 font-semibold mb-3 text-sm uppercase tracking-wider">Uploaded Files:</h4>
                    <div className="space-y-2">
                      {formData.media.map((file, i) => (
                        <div key={i} className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg hover:bg-gray-700/70 transition-colors">
                          <span className="text-gray-300 flex items-center">
                            <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                            {file.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeFile(i)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium px-3 py-1 rounded-lg hover:bg-red-500/20 transition-all"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
  
              {/* Location Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block mb-3 text-green-400 font-semibold text-sm uppercase tracking-wider">
                    Latitude
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="any"
                      name="latitude" 
                      value={formData.latitude} 
                      onChange={handleChange}
                      placeholder="e.g., 28.6139" 
                      required 
                      className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
                
                <div className="group">
                  <label className="block mb-3 text-green-400 font-semibold text-sm uppercase tracking-wider">
                    Longitude
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      step="any"
                      name="longitude" 
                      value={formData.longitude} 
                      onChange={handleChange}
                      placeholder="e.g., 77.2090" 
                      required 
                      className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              </div>
  
              {/* Tokens and Voting End Time */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="group">
                  <label className="block mb-3 text-green-400 font-semibold text-sm uppercase tracking-wider">
                    Tokens Requested
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      name="tokensRequested" 
                      value={formData.tokensRequested} 
                      onChange={handleChange}
                      placeholder="e.g., 100" 
                      required 
                      className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
                
                <div className="group">
                  <label className="block mb-3 text-green-400 font-semibold text-sm uppercase tracking-wider">
                    Voting End Time
                  </label>
                  <div className="relative">
                    <input 
                      type="datetime-local" 
                      name="votingEndTime" 
                      value={formData.votingEndTime}
                      onChange={handleChange} 
                      required 
                      className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              </div>
  
              {/* Description */}
              <div className="group">
                <label className="block mb-3 text-green-400 font-semibold text-sm uppercase tracking-wider">
                  Claim Description
                </label>
                <div className="relative">
                  <textarea 
                    name="description" 
                    value={formData.description} 
                    onChange={handleChange}
                    placeholder="Describe your carbon credit claim in detail..." 
                    required 
                    rows={5}
                    className="w-full p-4 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all duration-300 hover:border-green-500/50 resize-none"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-xl pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </div>
              </div>
  
              {/* Submit Button */}
              <div className="pt-4">
                <button 
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitStatus === 'submitting' || isPending}
                  className={`group relative w-full px-8 py-4 rounded-xl font-semibold text-lg overflow-hidden transition-all duration-300 ${
                    submitStatus === 'submitting' || isPending
                      ? 'bg-gray-600 cursor-not-allowed opacity-50' 
                      : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 hover:shadow-2xl hover:shadow-green-500/30 hover:scale-105 text-white'
                  }`}
                >
                  <span className="relative z-10 flex items-center justify-center">
                    {submitStatus === 'submitting' || isPending ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Creating Claim...
                      </>
                    ) : (
                      "Create Claim"
                    )}
                  </span>
                  {!(submitStatus === 'submitting' || isPending) && (
                    <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  )}
                </button>
              </div>
            </div>
  
            {/* Info Section */}
            <div className="mt-8 p-6 bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-xl border border-gray-600/30">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  <div className="w-6 h-6 bg-gradient-to-r from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-blue-300 mb-2 text-sm uppercase tracking-wider">Important Note</h3>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    This form creates a carbon credit claim on the blockchain. The uploaded files will be processed and stored securely using decentralized storage.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
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
      `}</style>
    </section>
  );
};

export default ClaimForm;