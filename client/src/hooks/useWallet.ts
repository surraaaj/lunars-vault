import { useState, useCallback, useEffect } from 'react';
import type { WalletState } from '@/types';

const QUAI_CYPRUS1_CHAIN_ID = '0x3a98'; // Orchard Cyprus-1 (15000)
const LOCALHOST_CHAIN_ID = '0x7a69'; // 31337 in hex

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const getProvider = useCallback(() => {
    if (typeof window.pelagus !== 'undefined') return window.pelagus;
    if (typeof window.ethereum !== 'undefined') return window.ethereum;
    return null;
  }, []);

  const checkConnection = useCallback(async () => {
    const provider = getProvider();
    if (!provider) return;

    try {
      const accounts = await provider.request({ method: 'eth_accounts' });
      const chainId = await provider.request({ method: 'eth_chainId' });

      if (accounts.length > 0) {
        setState({
          isConnected: true,
          address: accounts[0],
          chainId,
          isConnecting: false,
          error: null,
        });
      }
    } catch (err) {
      console.error('Error checking connection:', err);
    }
  }, [getProvider]);

  useEffect(() => {
    checkConnection();
    const provider = getProvider();

    if (provider) {
      const handleAccounts = (accounts: string[]) => {
        if (accounts.length === 0) {
          setState({
            isConnected: false,
            address: null,
            chainId: null,
            isConnecting: false,
            error: null,
          });
        } else {
          setState(prev => ({
            ...prev,
            isConnected: true,
            address: accounts[0],
          }));
        }
      };

      const handleChain = (chainId: string) => {
        setState(prev => ({ ...prev, chainId }));
        window.location.reload();
      };

      provider.on('accountsChanged', handleAccounts);
      provider.on('chainChanged', handleChain);

      return () => {
        provider.removeListener('accountsChanged', handleAccounts);
        provider.removeListener('chainChanged', handleChain);
      };
    }
  }, [checkConnection, getProvider]);

  const connect = useCallback(async () => {
    const provider = getProvider();
    if (!provider) {
      setState(prev => ({ ...prev, error: 'Please install Pelagus or MetaMask' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
      });

      const chainId = await provider.request({ method: 'eth_chainId' });

      // Switch to Quai Cyprus-1 if on wrong network AND using Pelagus
      // Or allow 31337 if using localhost
      if (chainId !== QUAI_CYPRUS1_CHAIN_ID && chainId !== LOCALHOST_CHAIN_ID) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: QUAI_CYPRUS1_CHAIN_ID }],
          });
        } catch (switchError: any) {
          // If network doesn't exist AND using Pelagus, add it
          if (switchError.code === 4902 && typeof window.pelagus !== 'undefined') {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: QUAI_CYPRUS1_CHAIN_ID,
                  chainName: 'Quai Cyprus-1 Testnet',
                  nativeCurrency: {
                    name: 'Quai',
                    symbol: 'QUAI',
                    decimals: 18,
                  },
                  rpcUrls: ['https://cyprus1.rpc.quai.network'],
                  blockExplorerUrls: ['https://cyprus1.quaiscan.io'],
                },
              ],
            });
          }
        }
      }

      setState({
        isConnected: true,
        address: accounts[0],
        chainId,
        isConnecting: false,
        error: null,
      });
    } catch (err: any) {
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: err.message || 'Failed to connect wallet',
      }));
    }
  }, []);

  const disconnect = useCallback(async () => {
    const provider = getProvider();
    if (provider) {
      try {
        await provider.request({
          method: 'wallet_revokePermissions',
          params: [{ eth_accounts: {} }],
        });
      } catch (err) {
        // Many wallets (including some versions of MetaMask/Pelagus) don't support revoking permissions programmatically.
        // We catch the error silently since we still want to clear the local state below either way.
        console.warn('wallet_revokePermissions not supported or failed:', err);
      }
    }

    setState({
      isConnected: false,
      address: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });
  }, [getProvider]);

  return {
    ...state,
    connect,
    disconnect,
    isCorrectNetwork: state.chainId === QUAI_CYPRUS1_CHAIN_ID || state.chainId === LOCALHOST_CHAIN_ID,
  };
}

// Extend Window interface
declare global {
  interface Window {
    pelagus?: any;
    ethereum?: any;
  }
}
