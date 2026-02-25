import { useState, useCallback } from 'react';
import { Upload, File, X, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { TransactionState } from '@/types';

interface StagingZoneProps {
  isConnected: boolean;
  walletAddress: string | null;
  transactionState: TransactionState;
  transactionMessage: string;
  onVaultAsset: (file: File, assetName: string) => Promise<boolean>;
}

export function StagingZone({
  isConnected,
  walletAddress,
  transactionState,
  transactionMessage,
  onVaultAsset,
}: StagingZoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [assetName, setAssetName] = useState('');

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleFile(droppedFile);
    }
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  }, []);

  const handleFile = (selectedFile: File) => {
    setFile(selectedFile);
    
    if (selectedFile.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    } else {
      setPreview(null);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setAssetName('');
  };

  const handleVault = async () => {
    if (!file || !walletAddress) return;
    const success = await onVaultAsset(file, assetName);
    if (success) {
      clearFile();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isProcessing = transactionState === 'uploading' || transactionState === 'confirming';
  const isSuccess = transactionState === 'success';

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-14 overflow-hidden">
      <div className="relative z-10 w-full max-w-lg mx-auto px-6 py-16">
        {/* Headline */}
        <h1 className="text-3xl sm:text-4xl font-medium text-center text-foreground mb-3 tracking-tight">
          Secure Your Legacy
        </h1>

        {/* Subheadline */}
        <p className="text-sm text-center text-muted-foreground mb-10 max-w-sm mx-auto leading-relaxed">
          Vault your intellectual property on Quai. Immutable. Verifiable. Permanent.
        </p>

        {/* Upload Card */}
        <div className="bg-card rounded-xl border border-border/60 shadow-sm p-6">
          {!file ? (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              className={`relative border border-dashed rounded-lg p-10 text-center transition-all duration-200 ${
                dragActive
                  ? 'border-foreground/30 bg-muted'
                  : 'border-border bg-muted/30 hover:border-foreground/20 hover:bg-muted/50'
              }`}
            >
              <input
                type="file"
                id="file-upload"
                onChange={handleFileInput}
                className="hidden"
                accept="image/*,application/pdf,video/*"
              />
              <label
                htmlFor="file-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground mb-1">
                  Drop file or click to browse
                </p>
                <p className="text-xs text-muted-foreground">
                  Images, PDFs up to 50MB
                </p>
              </label>
            </div>
          ) : (
            <div className="fade-in">
              {/* File Preview */}
              <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg mb-4">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-14 h-14 object-cover rounded-md"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-md bg-muted flex items-center justify-center">
                    <File className="w-6 h-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
                <button
                  onClick={clearFile}
                  className="p-1.5 hover:bg-muted rounded-md transition-colors"
                  disabled={isProcessing}
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Asset Name Input */}
              <div className="mb-4">
                <Input
                  type="text"
                  placeholder="Asset name"
                  value={assetName}
                  onChange={(e) => setAssetName(e.target.value)}
                  disabled={isProcessing}
                  className="w-full text-sm h-10"
                />
              </div>

              {/* Vault Button */}
              <Button
                onClick={handleVault}
                disabled={!isConnected || isProcessing}
                className={`w-full btn-lift rounded-lg h-10 text-sm font-medium transition-all ${
                  isSuccess
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                    : 'bg-foreground text-background hover:bg-foreground/90'
                }`}
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 spinner" />
                    {transactionMessage}
                  </span>
                ) : isSuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {transactionMessage}
                  </span>
                ) : !isConnected ? (
                  'Connect wallet to vault'
                ) : (
                  'Vault asset'
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Connection hint */}
        {!isConnected && (
          <p className="text-center text-xs text-muted-foreground mt-4">
            Connect Pelagus to begin
          </p>
        )}
      </div>
    </section>
  );
}
