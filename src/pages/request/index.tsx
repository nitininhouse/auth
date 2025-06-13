import { Clock, Check, Loader2, AlertCircle, Users, Eye, CheckCircle, XCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

interface LendRequest {
  id: number;
  borrowerAddress: string;
  lenderAddress: string;
  carbonCredits: number;
  response: number;
  interestRate: number;
  timeOfissue: number;
  eligibilityScore: number;
  proofData: string;
  status: number;
  recommendation: number;
}

interface DisplayRequest {
  id: string;
  requestId: number;
  borrowerAddress: string;
  creditsRequested: number;
  zkProofStatus: 'Verified' | 'Pending Verification';
  eligibilityScore: number;
  requestDate: string;
  interestRate: number;
  status: 'Pending' | 'Approved' | 'Declined';
  canRespond: boolean;
}

const contractAddress = '0x01ad9Ea4DA34c5386135951a50823eCaC3ec3Ec5' as `0x${string}`;

const contractABI = [
  {
    "type": "function",
    "name": "getUserLendRequestsLenderPOV",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "internalType": "struct LendRequest[]",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "borrowerAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lenderAddress",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "carbonCredits",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "response",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "interestRate",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "timeOfissue",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "eligibilityScore",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "proofData",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "status",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "recommendation",
            "type": "uint256",
            "internalType": "uint256"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "respondToLendRequest",
    "inputs": [
      {
        "name": "requestId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "response",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
] as const;

export default function CreditRequests() {
  const [incomingRequests, setIncomingRequests] = useState<DisplayRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isResponding, setIsResponding] = useState<Record<string, boolean>>({});
  const [txStatus, setTxStatus] = useState<Record<string, 'success' | 'error' | ''>>({});
  const [respondingRequestId, setRespondingRequestId] = useState<number | null>(null);
  const [isClient, setIsClient] = useState(false);

  const { address, isConnected } = useAccount();
  const { writeContract, data: hash, isPending } = useWriteContract();
  
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read contract data with proper error handling
  const { data: lendRequestsData, isError: isReadError, isLoading: isReadLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getUserLendRequestsLenderPOV',
    query: {
      enabled: !!address && isConnected,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Fix hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Process contract data with better error handling and debugging
  useEffect(() => {
    if (!isClient) return;

    console.log("Processing contract data:", {
      isConnected,
      address,
      lendRequestsData,
      isReadLoading,
      isReadError
    });

    if (!isConnected) {
      setError("Please connect your wallet");
      setIsLoading(false);
      return;
    }

    if (isReadLoading) {
      setIsLoading(true);
      setError('');
      return;
    }

    if (isReadError) {
      console.error("Contract read error:", isReadError);
      setError('Failed to load requests. Please check your connection and try again.');
      setIsLoading(false);
      return;
    }

    if (lendRequestsData !== undefined) {
      try {
        console.log("Raw lend requests data:", lendRequestsData);
        
        if (!Array.isArray(lendRequestsData)) {
          console.error("Expected array but got:", typeof lendRequestsData);
          setError("Invalid data format received from contract");
          setIsLoading(false);
          return;
        }

        // Format requests for display with better error handling
        const formattedRequests = lendRequestsData.map((req: any, index: number) => {
          console.log(`Processing request ${index}:`, req);
          
          try {
            const requestId = Number(req.id || 0);
            const carbonCredits = Number(req.carbonCredits || 0);
            const timeOfIssue = Number(req.timeOfissue || Date.now() / 1000);
            const eligibilityScore = Number(req.eligibilityScore || 0);
            const response = Number(req.response || 0);
            const interestRate = Number(req.interestRate || 5);

            return {
              id: `#${requestId.toString().padStart(8, '0')}`,
              requestId: requestId,
              borrowerAddress: String(req.borrowerAddress || ''),
              creditsRequested: carbonCredits,
              zkProofStatus: (req.proofData && req.proofData !== '') ? 'Verified' as const : 'Pending Verification' as const,
              eligibilityScore: eligibilityScore,
              requestDate: new Date(timeOfIssue * 1000).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              }),
              interestRate: interestRate,
              status: response === 0 ? 'Pending' as const : 
                     response === 1 ? 'Approved' as const : 'Declined' as const,
              canRespond: response === 0 && 
                         String(req.lenderAddress || '').toLowerCase() === (address || '').toLowerCase()
            };
          } catch (itemError) {
            console.error(`Error processing request ${index}:`, itemError, req);
            return null;
          }
        }).filter(Boolean); // Remove null entries

        console.log("Formatted requests:", formattedRequests);
        setIncomingRequests(formattedRequests as DisplayRequest[]);
        setError('');
      } catch (err) {
        console.error('Error processing requests:', err);
        setError('Failed to process requests data. Please try refreshing the page.');
      }
    } else {
      console.log("No data received from contract");
      setIncomingRequests([]);
    }

    setIsLoading(false);
  }, [isClient, isConnected, lendRequestsData, isReadLoading, isReadError, address]);

  // Handle request response (approve/decline)
  const handleRequestResponse = async (requestId: number, approve: boolean) => {
    if (!isConnected) {
      setError("Please connect your wallet");
      return;
    }

    try {
      setIsResponding(prev => ({ ...prev, [requestId.toString()]: true }));
      setTxStatus(prev => ({ ...prev, [requestId.toString()]: '' }));
      setError('');
      setRespondingRequestId(requestId);

      console.log("Responding to request:", { requestId, approve });

      // Call contract method to respond to request (1 = approve, 2 = decline)
      const responseValue = approve ? 1 : 2;
      
      writeContract({
        address: contractAddress,
        abi: contractABI,
        functionName: 'respondToLendRequest',
        args: [BigInt(requestId), BigInt(responseValue)],
      });

    } catch (error) {
      console.error('Error responding to request:', error);
      setTxStatus(prev => ({ ...prev, [requestId.toString()]: 'error' }));
      setError('Transaction failed. Please try again.');
      setIsResponding(prev => ({ ...prev, [requestId.toString()]: false }));
      setRespondingRequestId(null);
    }
  };

  // Handle transaction confirmation
  useEffect(() => {
    if (isConfirmed && respondingRequestId) {
      setTxStatus(prev => ({ ...prev, [respondingRequestId.toString()]: 'success' }));
      setIsResponding(prev => ({ ...prev, [respondingRequestId.toString()]: false }));
      setRespondingRequestId(null);
      
      // Refetch data to update the UI
      setTimeout(() => {
        refetch();
      }, 2000); // Give some time for the blockchain to update
    }
  }, [isConfirmed, respondingRequestId, refetch]);

  // Handle transaction errors
  useEffect(() => {
    if (!isPending && !isConfirming && respondingRequestId && !isConfirmed) {
      // Transaction might have failed
      setTimeout(() => {
        setIsResponding(prev => ({ ...prev, [respondingRequestId.toString()]: false }));
        setRespondingRequestId(null);
      }, 1000);
    }
  }, [isPending, isConfirming, isConfirmed, respondingRequestId]);

  const currentDate = new Date();
  const formattedDate = `Today, ${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')}`;

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-green-400 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-green-400 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center px-6">
        <div className="relative group max-w-md w-full">
          <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-3xl blur-3xl opacity-30" />
          <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-3xl p-8 border border-green-500/30 text-center">
            <Users className="w-16 h-16 mx-auto mb-4 text-green-400" />
            <h2 className="text-2xl font-bold text-white mb-4">Wallet Connection Required</h2>
            <p className="text-gray-300 mb-6">Please connect your wallet to view credit requests.</p>
            <div className="text-sm text-green-400 bg-green-500/10 px-4 py-2 rounded-lg border border-green-500/30">
              Connect your wallet to continue
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin h-16 w-16 text-green-400 mx-auto mb-4" />
          <p className="text-green-400 font-medium">Loading credit requests...</p>
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
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-white mb-2">
                Credit
                <span className="block bg-gradient-to-r from-green-400 via-emerald-400 to-green-300 bg-clip-text text-transparent">
                  Requests
                </span>
              </h1>
              <p className="text-gray-300 text-lg">Manage incoming loan requests</p>
            </div>
            <div className="flex items-center text-gray-400 bg-gray-800/50 backdrop-blur-sm rounded-xl px-4 py-2 border border-green-500/30">
              <Clock className="w-5 h-5 mr-2 text-green-400" />
              <span>Last updated: {formattedDate}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Requests</p>
                  <p className="text-white text-2xl font-bold">{incomingRequests.length}</p>
                </div>
                <Eye className="w-8 h-8 text-blue-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Pending</p>
                  <p className="text-white text-2xl font-bold">
                    {incomingRequests.filter(r => r.status === 'Pending').length}
                  </p>
                </div>
                <Clock className="w-8 h-8 text-yellow-400" />
              </div>
            </div>
            <div className="bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Approved</p>
                  <p className="text-white text-2xl font-bold">
                    {incomingRequests.filter(r => r.status === 'Approved').length}
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-900/50 border border-red-500/30 text-red-300 p-4 mb-6 rounded-xl backdrop-blur-sm">
            <div className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-red-400" />
              <span>{error}</span>
              <button 
                onClick={() => {
                  setError('');
                  refetch();
                }}
                className="ml-auto text-red-400 hover:text-red-300 underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Debug Info (remove in production) */}
        <div className="mb-6 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
          <p className="text-gray-400 text-sm mb-2">Debug Info:</p>
          <p className="text-gray-300 text-xs font-mono">
            Connected: {isConnected.toString()} | 
            Address: {address || 'None'} | 
            Data Length: {lendRequestsData ? (Array.isArray(lendRequestsData) ? lendRequestsData.length : 'Not array') : 'No data'} |
            Loading: {isReadLoading.toString()} |
            Error: {isReadError ? 'Yes' : 'No'}
          </p>
        </div>

        {/* Incoming Requests */}
        <div className="space-y-6">
          {incomingRequests.length > 0 ? (
            incomingRequests.map((request) => (
              <div key={request.id} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-green-600/10 to-emerald-600/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-6 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                        <Users className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h2 className="font-bold text-white text-lg">
                          {request.borrowerAddress.slice(0, 6)}...{request.borrowerAddress.slice(-4)}
                        </h2>
                        <p className="text-gray-400 text-sm">Request ID: {request.id}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {request.canRespond && (
                        <>
                          <button
                            onClick={() => handleRequestResponse(request.requestId, true)}
                            disabled={isResponding[request.requestId.toString()] || isPending || isConfirming}
                            className={`bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center ${
                              isResponding[request.requestId.toString()] || isPending || isConfirming ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg hover:shadow-green-500/30'
                            }`}
                          >
                            {(isResponding[request.requestId.toString()] || isPending || isConfirming) && respondingRequestId === request.requestId ? (
                              <Loader2 className="animate-spin h-4 w-4 mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Approve
                          </button>
                          <button
                            onClick={() => handleRequestResponse(request.requestId, false)}
                            disabled={isResponding[request.requestId.toString()] || isPending || isConfirming}
                            className={`bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-semibold transition-all duration-300 flex items-center ${
                              isResponding[request.requestId.toString()] || isPending || isConfirming ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Decline
                          </button>
                        </>
                      )}
                      {!request.canRespond && (
                        <span className={`px-4 py-2 rounded-xl text-sm font-semibold ${
                          request.status === 'Approved' ? 'bg-green-900/50 text-green-300 border border-green-500/30' :
                          request.status === 'Declined' ? 'bg-red-900/50 text-red-300 border border-red-500/30' :
                          'bg-gray-800/50 text-gray-300 border border-gray-600/30'
                        }`}>
                          {request.status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                      <p className="text-gray-400 text-sm mb-2">Credits Requested</p>
                      <p className="font-bold text-white text-xl">{request.creditsRequested} CCU</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                      <p className="text-gray-400 text-sm mb-2">ZK Proof Status</p>
                      <p className={`font-bold text-xl ${
                        request.zkProofStatus === 'Verified' ? 'text-green-400' : 'text-amber-400'
                      }`}>
                        {request.zkProofStatus}
                      </p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                      <p className="text-gray-400 text-sm mb-2">Eligibility Score</p>
                      <p className="font-bold text-white text-xl">{request.eligibilityScore}/100</p>
                    </div>
                    <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/30">
                      <p className="text-gray-400 text-sm mb-2">Interest Rate</p>
                      <p className="font-bold text-white text-xl">{request.interestRate}%</p>
                    </div>
                  </div>

                  {/* Transaction status feedback */}
                  {txStatus[request.requestId.toString()] === 'success' && (
                    <div className="mt-4 bg-green-900/50 text-green-300 p-3 rounded-xl text-sm flex items-center border border-green-500/30">
                      <Check className="h-4 w-4 mr-2" />
                      Transaction successful! The request has been processed.
                    </div>
                  )}
                  {txStatus[request.requestId.toString()] === 'error' && (
                    <div className="mt-4 bg-red-900/50 text-red-300 p-3 rounded-xl text-sm flex items-center border border-red-500/30">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Transaction failed. Please try again.
                    </div>
                  )}
                  {(isPending || isConfirming) && respondingRequestId === request.requestId && (
                    <div className="mt-4 bg-blue-900/50 text-blue-300 p-3 rounded-xl text-sm flex items-center border border-blue-500/30">
                      <Loader2 className="animate-spin h-4 w-4 mr-2" />
                      {isPending ? 'Confirming transaction...' : 'Waiting for blockchain confirmation...'}
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-gray-600/10 to-gray-700/10 rounded-2xl blur-xl opacity-50" />
              <div className="relative bg-gradient-to-br from-gray-800/90 to-gray-900/90 backdrop-blur-xl rounded-2xl p-12 border border-gray-700/50 text-center">
                <Users className="w-16 h-16 mx-auto mb-4 text-gray-500" />
                <h3 className="text-xl font-bold text-gray-300 mb-2">No Credit Requests</h3>
                <p className="text-gray-400">No incoming credit requests found at the moment.</p>
                <button 
                  onClick={() => refetch()}
                  className="mt-4 bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-xl font-semibold transition-colors duration-300"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <style jsx>{`
        @keyframes grid-move {
          0% { transform: translate(0, 0); }
          100% { transform: translate(50px, 50px); }
        }
      `}</style>
    </div>
  );
}