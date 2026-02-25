import { useState, useCallback, useEffect } from 'react';
import type { WalletState } from '@/types';

const QUAI_CYPRUS1_CHAIN_ID = '0x1c72';

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isConnecting: false,
    error: null,
  });

  const checkConnection = useCallback(async () => {
    if (typeof window.pelagus === 'undefined') {
      setState(prev => ({ ...prev, error: 'Pelagus not installed' }));
      return;
    }

    try {
      const accounts = await window.pelagus.request({ method: 'eth_accounts' });
      const chainId = await window.pelagus.request({ method: 'eth_chainId' });
      
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
  }, []);

  useEffect(() => {
    checkConnection();

    if (window.pelagus) {
      window.pelagus.on('accountsChanged', (accounts: string[]) => {
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
      });

      window.pelagus.on('chainChanged', (chainId: string) => {
        setState(prev => ({ ...prev, chainId }));
        window.location.reload();
      });
    }

    return () => {
      if (window.pelagus) {
        window.pelagus.removeAllListeners('accountsChanged');
        window.pelagus.removeAllListeners('chainChanged');
      }
    };
  }, [checkConnection]);

  const connect = useCallback(async () => {
    if (typeof window.pelagus === 'undefined') {
      setState(prev => ({ ...prev, error: 'Please install Pelagus' }));
      window.open('https://pelaguswallet.io/', '_blank');
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const accounts = await window.pelagus.request({
        method: 'eth_requestAccounts',
      });
      
      const chainId = await window.pelagus.request({ method: 'eth_chainId' });
      
      // Check if on correct network
      if (chainId !== QUAI_CYPRUS1_CHAIN_ID) {
        try {
          await window.pelagus.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: QUAI_CYPRUS1_CHAIN_ID }],
          });
        } catch (switchError: any) {
          // If network doesn't exist, add it
          if (switchError.code === 4902) {
            await window.pelagus.request({
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

  const disconnect = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      chainId: null,
      isConnecting: false,
      error: null,
    });
  }, []);

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return {
    ...state,
    connect,
    disconnect,
    truncateAddress,
    isCorrectNetwork: state.chainId === QUAI_CYPRUS1_CHAIN_ID,
  };
}

// Extend Window interface for Pelagus
declare global {
  interface Window {
    pelagus?: any;
  }
}
