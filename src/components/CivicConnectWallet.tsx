import React from 'react';
import { useUser, useWallet, UserButton } from "@civic/auth-web3/react";
import { useAutoConnect } from "@civic/auth-web3/wagmi";
import { useAccount, useConnect } from "wagmi";

const CivicConnectWallet = () => {
  const userContext = useUser();
  const walletContext = useWallet({ type: 'ethereum' }); // or 'solana' depending on your chain
  const { isConnected, address } = useAccount();
  const { connectors, connect } = useConnect();

  // Auto-connect wallet when user logs in
  useAutoConnect();

  const createWallet = async () => {
    if (userContext.user && walletContext && !walletContext.wallet) {
      try {
        connectWallet();
      } catch (error) {
        console.error('Failed to connect wallet:', error);
      }
    }
  };

  const connectWallet = () => {
    const civicConnector = connectors.find(c => c.name === 'Civic');
    if (civicConnector) {
      connect({ connector: civicConnector });
    }
  };

  // If user is not logged in, show login button
  if (!userContext.user) {
    return <UserButton />;
  }

  // If user doesn't have a wallet, show create wallet button
  if (!walletContext?.wallet) {
    return (
      <div className="flex items-center gap-2">
        <UserButton />
        <button onClick={createWallet} className="btn">
          Create Wallet
        </button>
      </div>
    );
  }

  // If user has wallet but not connected, show connect button
  if (walletContext.wallet && !isConnected) {
    return (
      <div className="flex items-center gap-2">
        <UserButton />
        <button onClick={connectWallet} className="btn">
          Connect Wallet
        </button>
      </div>
    );
  }

  // If connected, show wallet address
  const btnText = address
    ? `${address.slice(0, 5)}...${address.slice(-4)}`
    : "Wallet Connected";

  return (
    <div className="flex items-center gap-2">
      <UserButton />
      <button className="btn">
        {btnText}
      </button>
    </div>
  );
};

export default CivicConnectWallet;