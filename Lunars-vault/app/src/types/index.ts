export interface VaultedAsset {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  dataHavenHash: string;
  timestamp: number;
  creator: string;
  status: 'verified' | 'pending' | 'failed';
}

export interface VerificationResult {
  found: boolean;
  asset?: VaultedAsset;
  message: string;
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: string | null;
  isConnecting: boolean;
  error: string | null;
}

export type TransactionState = 
  | 'idle' 
  | 'uploading' 
  | 'confirming' 
  | 'success' 
  | 'error';

export interface DropZoneFile {
  file: File;
  preview?: string;
}
