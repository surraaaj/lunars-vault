import { useWallet } from '@/hooks/useWallet';
import { useVault } from '@/hooks/useVault';
import { useTheme } from '@/hooks/useTheme';
import { Header } from '@/sections/Header';
import { ParticleBackground } from '@/sections/ParticleBackground';
import { StagingZone } from '@/sections/StagingZone';
import { ImmutableLedger } from '@/sections/ImmutableLedger';
import { VerificationSearch } from '@/sections/VerificationSearch';
import { Footer } from '@/sections/Footer';
import './App.css';

function App() {
  const wallet = useWallet();
  const vault = useVault();
  const { theme, toggleTheme, mounted } = useTheme();

  const handleVaultAsset = async (file: File, assetName: string): Promise<boolean> => {
    if (!wallet.address) return false;
    return await vault.vaultAsset(file, assetName, wallet.address);
  };

  // Prevent flash of wrong theme
  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Global Header */}
      <Header
        isConnected={wallet.isConnected}
        address={wallet.address}
        isConnecting={wallet.isConnecting}
        onConnect={wallet.connect}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content */}
      <main>
        {/* Hero / Staging Zone with Particles */}
        <div className="relative">
          <ParticleBackground />
          <StagingZone
            isConnected={wallet.isConnected}
            walletAddress={wallet.address}
            transactionState={vault.transactionState}
            transactionMessage={vault.transactionMessage}
            onVaultAsset={handleVaultAsset}
          />
        </div>

        {/* Immutable Ledger */}
        <ImmutableLedger
          assets={vault.assets}
          formatFileSize={vault.formatFileSize}
          formatTimestamp={vault.formatTimestamp}
          truncateHash={vault.truncateHash}
        />

        {/* Verification Search */}
        <VerificationSearch
          isVerifying={vault.isVerifying}
          verificationResult={vault.verificationResult}
          onVerify={vault.verifyHash}
          formatTimestamp={vault.formatTimestamp}
        />
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

export default App;
