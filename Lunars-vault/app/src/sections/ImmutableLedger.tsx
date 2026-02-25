import { useState } from 'react';
import { 
  FileImage, 
  FileText, 
  FileVideo, 
  File as FileIcon,
  CheckCircle, 
  Copy, 
  ExternalLink,
  PackageOpen,
  ArrowUp
} from 'lucide-react';
import type { VaultedAsset } from '@/types';
import { Button } from '@/components/ui/button';

interface ImmutableLedgerProps {
  assets: VaultedAsset[];
  formatFileSize: (bytes: number) => string;
  formatTimestamp: (timestamp: number) => string;
  truncateHash: (hash: string, length?: number) => string;
}

export function ImmutableLedger({
  assets,
  formatFileSize,
  formatTimestamp,
  truncateHash,
}: ImmutableLedgerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) return FileImage;
    if (fileType.startsWith('video/')) return FileVideo;
    if (fileType === 'application/pdf') return FileText;
    return FileIcon;
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <section className="py-20 bg-muted/30">
      <div className="max-w-4xl mx-auto px-6">
        {/* Section Header */}
        <div className="mb-8">
          <h2 className="text-xl font-medium text-foreground mb-1">
            Vaulted assets
          </h2>
          <p className="text-sm text-muted-foreground">
            Your creations, secured on-chain
          </p>
        </div>

        {/* Assets Display */}
        {assets.length === 0 ? (
          <div className="text-center py-14">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <PackageOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              No assets vaulted
            </p>
            <Button
              onClick={scrollToTop}
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
            >
              <ArrowUp className="w-3.5 h-3.5 mr-1.5" />
              Vault your first
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Desktop Table */}
            <div className="hidden md:block bg-card rounded-lg border border-border/60 overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50 border-b border-border/60">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Hash
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map((asset) => {
                    const FileIconComponent = getFileIcon(asset.fileType);
                    return (
                      <tr
                        key={asset.id}
                        className="table-row-hover border-b border-border/40 last:border-b-0"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <FileIconComponent className="w-4 h-4 text-muted-foreground" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {asset.fileName}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(asset.fileSize)}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              {truncateHash(asset.dataHavenHash, 10)}
                            </code>
                            <button
                              onClick={() => copyToClipboard(asset.dataHavenHash, asset.id)}
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="Copy hash"
                            >
                              <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                            </button>
                            <a
                              href={`https://cyprus1.quaiscan.io/tx/${asset.dataHavenHash.replace('dh://', '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 hover:bg-muted rounded transition-colors"
                              title="View on explorer"
                            >
                              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                            </a>
                            {copiedId === asset.id && (
                              <span className="text-xs text-emerald-500 font-medium">
                                Copied
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-muted-foreground">
                            {formatTimestamp(asset.timestamp)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Verified
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-2">
              {assets.map((asset) => {
                const FileIconComponent = getFileIcon(asset.fileType);
                return (
                  <div
                    key={asset.id}
                    className="bg-card rounded-lg border border-border/60 p-4 card-lift"
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                        <FileIconComponent className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {asset.fileName}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(asset.fileSize)}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <code className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">
                          {truncateHash(asset.dataHavenHash, 6)}
                        </code>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => copyToClipboard(asset.dataHavenHash, asset.id)}
                            className="p-1 hover:bg-muted rounded transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                          {copiedId === asset.id && (
                            <span className="text-xs text-emerald-500 font-medium ml-1">
                              Copied
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(asset.timestamp)}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-500">
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verified
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
