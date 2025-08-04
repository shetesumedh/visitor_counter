import React, { useEffect, useState } from "react";
import { WagmiProvider, createConfig, useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "@wagmi/connectors";
import { ethers } from "ethers";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { baseSepolia } from "wagmi/chains"
import './App.css';
const queryClient = new QueryClient();

const CONTRACT_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS
const CONTRACT_ABI = [
  "function registerVisit() public",
  "function visitorCount() public view returns (uint256)"
];

// Wagmi config with injected connector
console.log("Injected connector:", injected());

const config = createConfig({
  autoConnect: true,
  connectors: [injected()],
  chains: [baseSepolia],
});

function AppContent() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  const [visitorCount, setVisitorCount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [txPending, setTxPending] = useState(false);

  // Get contract instance with signer or provider
  function getContract(signerOrProvider) {
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signerOrProvider);
  }

  // Fetch visitor count (read-only)
  async function fetchVisitorCount() {
    if (!window.ethereum) {
      alert("Please install MetaMask or compatible wallet");
      return;
    }
    setLoading(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = getContract(provider);
      const count = await contract.visitorCount();
      setVisitorCount(Number(count));
    } catch (error) {
      console.error("Failed to fetch visitor count", error);
    } finally {
      setLoading(false);
    }
  }

  // Register visit (send transaction)
  async function registerVisit() {
    if (!window.ethereum) {
      alert("Please install MetaMask or compatible wallet");
      return;
    }
    setTxPending(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = getContract(signer);
      const tx = await contract.registerVisit();
      await tx.wait();
      alert("Visit registered successfully!");
      fetchVisitorCount();
    } catch (error) {
      console.error(error);
      alert("Transaction failed or rejected.");
    } finally {
      setTxPending(false);
    }
  }

  React.useEffect(() => {
    if (isConnected) {
      fetchVisitorCount();
    } else {
      setVisitorCount(null);
    }
  }, [isConnected]);

  return (
	<div className="App">
	<header className="App-header">

	  <h1>Visitor Wallet Counter</h1>

      {!isConnected ? (
      <button className="my-button"
  onClick={() => connect({ connector: connectors[0] })}
  disabled={isPending}
>
  Connect Wallet
</button>

      ) : (
        <>
          <p><strong>Connected wallet:</strong> {address}</p>
          <button className="my-button"
	      onClick={registerVisit} disabled={txPending}>
            {txPending ? "Registering visit..." : "Register Visit"}
          </button>
          <button className="my-button-disconnect"
	      onClick={() => disconnect()} style={{ marginLeft: "1rem" }}>Disconnect</button>
        </>
      )}

      <div style={{ marginTop: "1.5rem" }}>
        {loading ? (
          <p>Loading visitor count...</p>
        ) : (
          visitorCount !== null && <p><strong>Total unique visitors:</strong> {visitorCount}</p>
        )}
      </div>
	  </header>
    </div>
  );
}

export default function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AppContent />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

