import { useState, useCallback } from 'react';
import type { VaultedAsset, TransactionState, VerificationResult } from '@/types';

// Mock data for demo purposes
const MOCK_ASSETS: VaultedAsset[] = [
  {
    id: '1',
    fileName: 'artwork_v1.png',
    fileType: 'image/png',
    fileSize: 2457600,
    dataHavenHash: 'dh://QmX7bV9aK3mP5nQ8rS2tU6wY1zC4dE7fG0hI9jK1lM2nO3p',
    timestamp: 1708876800,
    creator: '0x71C3a9A23F8b5E4D6c7A8B9C0D1E2F3A4B5C6D7E',
    status: 'verified',
  },
  {
    id: '2',
    fileName: 'whitepaper.pdf',
    fileType: 'application/pdf',
    fileSize: 5120000,
    dataHavenHash: 'dh://QmK9pR4sT7uW2xY5zC8dE1fG4hI7jK0lM3nO6pQ9rS2tU5v',
    timestamp: 1708790400,
    creator: '0x71C3a9A23F8b5E4D6c7A8B9C0D1E2F3A4B5C6D7E',
    status: 'verified',
  },
];

export function useVault() {
  const [assets, setAssets] = useState<VaultedAsset[]>(MOCK_ASSETS);
  const [transactionState, setTransactionState] = useState<TransactionState>('idle');
  const [transactionMessage, setTransactionMessage] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const vaultAsset = useCallback(async (
    file: File,
    assetName: string,
    creatorAddress: string
  ): Promise<boolean> => {
    setTransactionState('uploading');
    setTransactionMessage('Uploading to DataHaven...');

    // Simulate upload delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    setTransactionState('confirming');
    setTransactionMessage('Awaiting Quai Network Confirmation...');

    // Simulate blockchain confirmation delay
    await new Promise(resolve => setTimeout(resolve, 2500));

    // Create new asset
    const newAsset: VaultedAsset = {
      id: Date.now().toString(),
      fileName: assetName || file.name,
      fileType: file.type,
      fileSize: file.size,
      dataHavenHash: `dh://Qm${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`,
      timestamp: Math.floor(Date.now() / 1000),
      creator: creatorAddress,
      status: 'verified',
    };

    setAssets(prev => [newAsset, ...prev]);
    setTransactionState('success');
    setTransactionMessage('Asset Vaulted Successfully!');

    // Reset after 3 seconds
    setTimeout(() => {
      setTransactionState('idle');
      setTransactionMessage('');
    }, 3000);

    return true;
  }, []);

  const verifyHash = useCallback(async (hash: string): Promise<VerificationResult> => {
    setIsVerifying(true);
    setVerificationResult(null);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    const cleanHash = hash.trim();
    
    // Find asset by hash
    const asset = assets.find(a => 
      a.dataHavenHash === cleanHash || 
      a.dataHavenHash.replace('dh://', '') === cleanHash.replace('dh://', '')
    );

    let result: VerificationResult;

    if (asset) {
      result = {
        found: true,
        asset,
        message: 'Verified!',
      };
    } else {
      result = {
        found: false,
        message: 'Hash not found. This asset has not been vaulted.',
      };
    }

    setVerificationResult(result);
    setIsVerifying(false);
    return result;
  }, [assets]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateHash = (hash: string, length: number = 16): string => {
    if (hash.length <= length * 2 + 3) return hash;
    return `${hash.slice(0, length)}...${hash.slice(-length)}`;
  };

  return {
    assets,
    transactionState,
    transactionMessage,
    verificationResult,
    isVerifying,
    vaultAsset,
    verifyHash,
    formatFileSize,
    formatTimestamp,
    truncateHash,
  };
}
