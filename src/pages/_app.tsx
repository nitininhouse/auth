import Layout from "@/components/Layout";
import CounterContextProvider from "@/context/CounterContextProvider";
import WalletContextProvider from "@/context/WalletContextProvider";
import "@/styles/globals.css";
import type { AppProps } from "next/app";

// Civic and Wagmi imports
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { CivicAuthProvider } from "@civic/auth-web3/react";
import { embeddedWallet } from "@civic/auth-web3/wagmi";
import { sepolia } from "wagmi/chains";

// Create Wagmi config with Civic embedded wallet for Sepolia testnet
const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
  connectors: [
    embeddedWallet(),
  ],
});

// React Query client
const queryClient = new QueryClient();

export default function App({ Component, pageProps }: AppProps) {
  return (
    <QueryClientProvider client={queryClient}>
      <WagmiProvider config={wagmiConfig}>
        <CivicAuthProvider 
          clientId="c109402a-f214-4c1e-8ecb-4d0b95a424d0" // Get this from auth.civic.com
          initialChain={sepolia}
        >
          <WalletContextProvider>
            <CounterContextProvider>
              <Layout>
                <Component {...pageProps} />
              </Layout>
            </CounterContextProvider>
          </WalletContextProvider>
        </CivicAuthProvider>
      </WagmiProvider>
    </QueryClientProvider>
  );
}