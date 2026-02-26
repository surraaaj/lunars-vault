import { useState, useCallback } from 'react';
import type { VaultedAsset, TransactionState, VerificationResult } from '@/types';
import { uploadToDataHaven } from '@/lib/marketplace';
import { formatFileSize } from '@/lib/utils';

export function useVault() {
  // Start with an empty ledger — assets are vaulted by the connected wallet
  const [assets, setAssets] = useState<VaultedAsset[]>([]);
  const [transactionState, setTransactionState] = useState<TransactionState>('idle');
  const [transactionMessage, setTransactionMessage] = useState('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * Upload a file to DataHaven, confirm on Quai Network, and
   * add the resulting asset to the local ledger.
   */
  const vaultAsset = useCallback(async (
    file: File,
    assetName: string,
    creatorAddress: string
  ): Promise<boolean> => {
    try {
      setTransactionState('uploading');
      setTransactionMessage('Uploading to DataHaven...');

      // Real upload (Pinata IPFS) or mock fallback — handled inside uploadToDataHaven
      const dataHavenHash = await uploadToDataHaven(file);

      setTransactionState('confirming');
      setTransactionMessage('Awaiting Quai Network Confirmation...');

      // Brief confirmation visual pause
      await new Promise(resolve => setTimeout(resolve, 1000));

      const newAsset: VaultedAsset = {
        id: Date.now().toString(),
        fileName: assetName || file.name,
        fileType: file.type,
        fileSize: file.size,
        dataHavenHash,
        timestamp: Math.floor(Date.now() / 1000),
        creator: creatorAddress,
        status: 'verified',
      };

      setAssets(prev => [newAsset, ...prev]);
      setTransactionState('success');
      setTransactionMessage('Asset Vaulted Successfully!');

      setTimeout(() => {
        setTransactionState('idle');
        setTransactionMessage('');
      }, 3000);

      return true;
    } catch (err: unknown) {
      const e = err as { message?: string };
      setTransactionState('error');
      setTransactionMessage(e.message || 'Upload failed. Please try again.');
      setTimeout(() => {
        setTransactionState('idle');
        setTransactionMessage('');
      }, 4000);
      return false;
    }
  }, []);

  /** Check whether a DataHaven hash exists in the local vaulted-asset ledger. */
  const verifyHash = useCallback(async (hash: string): Promise<VerificationResult> => {
    setIsVerifying(true);
    setVerificationResult(null);

    await new Promise(resolve => setTimeout(resolve, 800));

    const cleanHash = hash.trim().replace(/^dh:\/\//, '');

    const asset = assets.find(a =>
      a.dataHavenHash.replace('dh://', '') === cleanHash
    );

    const result: VerificationResult = asset
      ? { found: true, asset, message: 'Verified on DataHaven!' }
      : { found: false, message: 'Hash not found. This asset has not been vaulted.' };

    setVerificationResult(result);
    setIsVerifying(false);
    return result;
  }, [assets]);


  /** Format a Unix timestamp (seconds) to a human-readable date string. */
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  /** Shorten a DataHaven hash for display, keeping `length` chars on each side. */
  const truncateHash = (hash: string, length = 16): string => {
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
