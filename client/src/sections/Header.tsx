import { Loader2, Sun, Moon, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { truncateAddress } from '@/lib/utils';

interface HeaderProps {
  isConnected: boolean;
  address: string | null;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

export function Header({ isConnected, address, isConnecting, onConnect, onDisconnect, theme, onToggleTheme }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo / Brand */}
          <span className="text-sm font-bold text-foreground tracking-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Lunars Vault
          </span>

          <div className="flex items-center gap-4">
            {/* Network Indicator */}
            <div className="hidden sm:flex items-center gap-2">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500/60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 network-pulse" />
              </span>
              <span className="text-xs font-medium text-muted-foreground tracking-wide">
                Quai Cyprus-1
              </span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'light' ? (
                <Moon className="w-4 h-4 text-muted-foreground" />
              ) : (
                <Sun className="w-4 h-4 text-muted-foreground" />
              )}
            </button>

            {/* Wallet Button */}
            <div className="flex items-center gap-1.5">
              <Button
                onClick={onConnect}
                disabled={isConnecting || isConnected}
                className={`btn-lift rounded-full px-4 py-2 text-xs font-semibold tracking-wide transition-all ${isConnected
                  ? 'bg-muted text-foreground hover:bg-muted/80'
                  : 'bg-foreground text-background hover:bg-foreground/90'
                  }`}
              >
                {isConnecting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 spinner" />
                    Connecting
                  </span>
                ) : isConnected && address ? (
                  <span>{truncateAddress(address, 5, 3)}</span>
                ) : (
                  <span>Connect Pelagus</span>
                )}
              </Button>
              {isConnected && (
                <Button
                  onClick={onDisconnect}
                  variant="ghost"
                  size="icon"
                  className="rounded-full w-9 h-9 text-muted-foreground hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  title="Disconnect Wallet"
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
