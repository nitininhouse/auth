import { Clock, Check, Loader2, AlertCircle } from 'lucide-react';
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

  // Read contract data
  const { data: lendRequestsData, isError: isReadError, isLoading: isReadLoading, refetch } = useReadContract({
    address: contractAddress,
    abi: contractABI,
    functionName: 'getUserLendRequestsLenderPOV',
    account: address,
  });

  // Fix hydration issues
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Process contract data
  useEffect(() => {
    if (!isClient) return;

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
      setError('Failed to load requests. Please try again.');
      setIsLoading(false);
      return;
    }

    if (lendRequestsData) {
      try {
        // Format requests for display
        const formattedRequests = lendRequestsData.map((req: any) => {
          return {
            id: `#${req.id.toString().padStart(8, '0')}`,
            requestId: Number(req.id),
            borrowerAddress: String(req.borrowerAddress),
            creditsRequested: Number(req.carbonCredits),
            zkProofStatus: req.proofData ? 'Verified' as const : 'Pending Verification' as const,
            eligibilityScore: Number(req.eligibilityScore),
            requestDate: new Date(Number(req.timeOfissue) * 1000).toLocaleDateString(),
            interestRate: 5, // You might want to get this from the contract
            status: Number(req.response) === 0 ? 'Pending' as const : 
                   Number(req.response) === 1 ? 'Approved' as const : 'Declined' as const,
            canRespond: Number(req.response) === 0 && 
                       String(req.lenderAddress).toLowerCase() === address?.toLowerCase()
          };
        });

        setIncomingRequests(formattedRequests);
        setError('');
      } catch (err) {
        console.error('Error processing requests:', err);
        setError('Failed to process requests data.');
      }
    } else {
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
      refetch();
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
  const formattedDate = `Today, ${currentDate.getHours()}:${currentDate.getMinutes() < 10 ? '0' + currentDate.getMinutes() : currentDate.getMinutes()}`;

  // Don't render anything until client-side hydration is complete
  if (!isClient) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-48"></div>
        </div>
      </div>
    );
  }

  if (!isConnected) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connect Your Wallet</h2>
          <p className="text-gray-600">Please connect your wallet to view credit requests.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin h-12 w-12 text-emerald-500" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6 rounded">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      {/* Incoming Requests Section */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Incoming Credit Requests</h1>
        <div className="flex items-center text-gray-500">
          <Clock className="w-5 h-5 mr-2" />
          <span>Last updated: {formattedDate}</span>
        </div>
      </div>

      {/* Incoming Requests */}
      <div className="space-y-6 mb-10">
        {incomingRequests.length > 0 ? (
          incomingRequests.map((request) => (
            <div key={request.id} className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <rect width="24" height="24" rx="4" fill="#E5EDFF" />
                      <path d="M8 9H16M8 13H14M8 17H12" stroke="#0052CC" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-semibold text-lg">{request.borrowerAddress}</h2>
                    <p className="text-gray-500 text-sm">Request ID: {request.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {request.canRespond && (
                    <>
                      <button
                        onClick={() => handleRequestResponse(request.requestId, true)}
                        disabled={isResponding[request.requestId.toString()] || isPending || isConfirming}
                        className={`bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition flex items-center ${
                          isResponding[request.requestId.toString()] || isPending || isConfirming ? 'opacity-50' : ''
                        }`}
                      >
                        {(isResponding[request.requestId.toString()] || isPending || isConfirming) && respondingRequestId === request.requestId ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        ) : null}
                        Approve
                      </button>
                      <button
                        onClick={() => handleRequestResponse(request.requestId, false)}
                        disabled={isResponding[request.requestId.toString()] || isPending || isConfirming}
                        className={`border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition flex items-center ${
                          isResponding[request.requestId.toString()] || isPending || isConfirming ? 'opacity-50' : ''
                        }`}
                      >
                        Decline
                      </button>
                    </>
                  )}
                  {!request.canRespond && (
                    <span className={`px-3 py-1 rounded-md text-sm ${
                      request.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      request.status === 'Declined' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {request.status}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-gray-500 text-sm mb-1">Credits Requested</p>
                  <p className="font-semibold text-lg">{request.creditsRequested} CCU</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">ZK Proof Status</p>
                  <p className={`font-semibold text-lg ${
                    request.zkProofStatus === 'Verified' ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {request.zkProofStatus}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Eligibility Score</p>
                  <p className="font-semibold text-lg">{request.eligibilityScore}/100</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm mb-1">Interest Rate</p>
                  <p className="font-semibold text-lg">{request.interestRate}%</p>
                </div>
              </div>

              {/* Transaction status feedback */}
              {txStatus[request.requestId.toString()] === 'success' && (
                <div className="mt-4 bg-green-50 text-green-700 p-2 rounded text-sm flex items-center">
                  <Check className="h-4 w-4 mr-2" />
                  Transaction successful!
                </div>
              )}
              {txStatus[request.requestId.toString()] === 'error' && (
                <div className="mt-4 bg-red-50 text-red-700 p-2 rounded text-sm flex items-center">
                  <AlertCircle className="h-4 w-4 mr-2" />
                  Transaction failed. Please try again.
                </div>
              )}
              {(isPending || isConfirming) && respondingRequestId === request.requestId && (
                <div className="mt-4 bg-blue-50 text-blue-700 p-2 rounded text-sm flex items-center">
                  <Loader2 className="animate-spin h-4 w-4 mr-2" />
                  {isPending ? 'Confirming transaction...' : 'Waiting for confirmation...'}
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 text-center">
            <p className="text-gray-500">No incoming credit requests found</p>
          </div>
        )}
      </div>
    </div>
  );
}