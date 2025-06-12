
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

const ConnectWallet = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        alert('Please install MetaMask!');
        return;
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      // Correct Chain ID for Base Mainnet is 8453 (0x2105)
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x2105',
              chainName: 'Base Mainnet',
              nativeCurrency: {
                name: 'Ethereum',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://mainnet.base.org'],
              blockExplorerUrls: ['https://basescan.org'],
            }],
          });
        } else {
          throw switchError;
        }
      }

      const newProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(newProvider);
      setAccount(accounts[0]);
    } catch (error) {
      console.error('Error connecting wallet or switching network:', error);
    }
  };

  useEffect(() => {
    const checkConnectedWallet = async () => {
      if (window.ethereum) {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (accounts.length > 0 && chainId === '0x2105') {
          const newProvider = new ethers.BrowserProvider(window.ethereum);
          setProvider(newProvider);
          setAccount(accounts[0]);
        }
      }
    };

    checkConnectedWallet();
  }, []);

  const btnText = account
    ? `${account.slice(0, 5)}...${account.slice(-4)}`
    : "Connect Wallet";

  return (
    <button onClick={connectWallet} className="btn">
      {btnText}
    </button>
  );
};

export default ConnectWallet;