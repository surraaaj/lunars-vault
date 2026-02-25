import { useState } from 'react';
import { Search, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { VerificationResult } from '@/types';

interface VerificationSearchProps {
  isVerifying: boolean;
  verificationResult: VerificationResult | null;
  onVerify: (hash: string) => Promise<VerificationResult>;
  formatTimestamp: (timestamp: number) => string;
}

export function VerificationSearch({
  isVerifying,
  verificationResult,
  onVerify,
  formatTimestamp,
}: VerificationSearchProps) {
  const [hash, setHash] = useState('');
  const [hasSearched, setHasSearched] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hash.trim() || isVerifying) return;
    
    setHasSearched(true);
    await onVerify(hash);
  };

  const truncateAddress = (address: string): string => {
    return `${address.slice(0, 8)}...${address.slice(-6)}`;
  };

  return (
    <section className="py-20 bg-background">
      <div className="max-w-md mx-auto px-6">
        {/* Section Header */}
        <div className="mb-6">
          <h2 className="text-xl font-medium text-foreground mb-1">
            Verify asset
          </h2>
          <p className="text-sm text-muted-foreground">
            Enter a DataHaven hash to verify
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                type="text"
                placeholder="dh://Qm..."
                value={hash}
                onChange={(e) => setHash(e.target.value)}
                disabled={isVerifying}
                className="w-full h-10 text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={!hash.trim() || isVerifying}
              className="btn-lift rounded-lg px-4 h-10 bg-foreground text-background hover:bg-foreground/90 text-sm font-medium"
            >
              {isVerifying ? (
                <Loader2 className="w-4 h-4 spinner" />
              ) : (
                <span className="flex items-center gap-1.5">
                  <Search className="w-4 h-4" />
                  Verify
                </span>
              )}
            </Button>
          </div>
        </form>

        {/* Result Display */}
        {hasSearched && verificationResult && (
          <div
            className={`rounded-lg p-4 border slide-in ${
              verificationResult.found
                ? 'bg-emerald-500/5 border-emerald-500/20'
                : 'bg-destructive/5 border-destructive/20'
            }`}
          >
            {verificationResult.found && verificationResult.asset ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  <span className="text-sm font-medium text-emerald-500">
                    Verified
                  </span>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Creator</span>
                    <code className="text-xs text-foreground">
                      {truncateAddress(verificationResult.asset.creator)}
                    </code>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Created</span>
                    <span className="text-xs text-foreground">
                      {formatTimestamp(verificationResult.asset.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Asset</span>
                    <span className="text-xs text-foreground">
                      {verificationResult.asset.fileName}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 text-destructive" />
                <span className="text-sm text-destructive">
                  Hash not found
                </span>
              </div>
            )}
          </div>
        )}

        {/* Help Text */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          Anyone can verify without trusting a central authority.
        </p>
      </div>
    </section>
  );
}
