import { Clock, Check, Loader2, AlertCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import CarbonCreditMarketplaceABI from '../../utils/CarbonCreditMarketplace.json';

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

export default function CreditRequests() {
  const [incomingRequests, setIncomingRequests] = useState<DisplayRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAccount, setCurrentAccount] = useState('');
  const [error, setError] = useState('');
  const [isResponding, setIsResponding] = useState<Record<string, boolean>>({});
  const [txStatus, setTxStatus] = useState<Record<string, 'success' | 'error' | ''>>({});

  // Contract configuration
  const contractAddress = '0x431Fb2E732D863934d49ae1e2799E802a9a18e2b';
  const contractABI = CarbonCreditMarketplaceABI.abi;

  // Connect to wallet
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setError('Please install MetaMask!');
        return;
      }

      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setError('Failed to connect wallet. Please try again.');
    }
  };

  // Fetch requests from blockchain
  const fetchRequests = async () => {
    if (!currentAccount) return;

    try {
      setIsLoading(true);
      setError('');
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CarbonCreditMarketplaceABI.abi, signer);

      // Fetch requests where current user is the lender
      const lenderRequests: LendRequest[] = await contract.getUserLendRequestsLenderPOV();
      
      // Format requests for display
      const formattedRequests = lenderRequests.map(req => {
        return {
          id: `#${req.id.toString().padStart(8, '0')}`,
          requestId: req.id,
          borrowerAddress: req.borrowerAddress,
          creditsRequested: req.carbonCredits,
          zkProofStatus: req.proofData ? 'Verified' as 'Verified' : 'Pending Verification' as 'Pending Verification',
          eligibilityScore: req.eligibilityScore,
          requestDate: new Date(req.timeOfissue * 1000).toLocaleDateString(),
          interestRate: 5,
          status: req.response === 0 ? 'Pending' as 'Pending' : 
                 req.response === 1 ? 'Approved' as 'Approved' : 'Declined' as 'Declined',
          canRespond: req.response === 0 && 
                     req.lenderAddress.toLowerCase() === currentAccount.toLowerCase()
        };
      });

      setIncomingRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching requests:', error);
      setError('Failed to load requests. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle request response (approve/decline)
  const handleRequestResponse = async (requestId: number, approve: boolean) => {
    try {
      setIsResponding(prev => ({ ...prev, [requestId.toString()]: true }));
      setTxStatus(prev => ({ ...prev, [requestId.toString()]: '' }));
      setError('');

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(contractAddress, CarbonCreditMarketplaceABI.abi, signer);

      // Call contract method to respond to request (1 = approve, 2 = decline)
      const responseValue = approve ? 1 : 2;
      const tx = await contract.respondToLendRequest(
        requestId,
        responseValue,
        { gasLimit: 500000 }
      );

      await tx.wait();
      setTxStatus(prev => ({ ...prev, [requestId.toString()]: 'success' }));
      fetchRequests(); // Refresh the list after successful response
    } catch (error) {
      console.error('Error responding to request:', error);
      setTxStatus(prev => ({ ...prev, [requestId.toString()]: 'error' }));
      setError('Transaction failed. Please try again.');
    } finally {
      setIsResponding(prev => ({ ...prev, [requestId.toString()]: false }));
    }
  };

  // Initialize
  useEffect(() => {
    connectWallet();
  }, []);

  // Fetch requests when account changes
  useEffect(() => {
    if (currentAccount) {
      fetchRequests();
    }
  }, [currentAccount]);

  const currentDate = new Date();
  const formattedDate = `Today, ${currentDate.getHours()}:${currentDate.getMinutes() < 10 ? '0' + currentDate.getMinutes() : currentDate.getMinutes()}`;

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
                        disabled={isResponding[request.requestId.toString()]}
                        className={`bg-emerald-500 text-white px-4 py-2 rounded-md hover:bg-emerald-600 transition flex items-center ${isResponding[request.requestId.toString()] ? 'opacity-50' : ''}`}
                      >
                        {isResponding[request.requestId.toString()] ? (
                          <Loader2 className="animate-spin h-4 w-4 mr-2" />
                        ) : (
                          'Approve'
                        )}
                      </button>
                      <button
                        onClick={() => handleRequestResponse(request.requestId, false)}
                        disabled={isResponding[request.requestId.toString()]}
                        className={`border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 transition flex items-center ${isResponding[request.requestId.toString()] ? 'opacity-50' : ''}`}
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

// Verifier contract:
// 0x42C1657F1d0B214dBfb20E7F69eC05f35E4d57f6

// CarbonCredit token:
// 0x1d4A8249E8f1E4B0DAD7a0896B74135517CD1F0e

// Marketplace:
// 0xd20241Ab97C41363cD11384DBaC3760d7052b340