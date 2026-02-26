import { ethers } from 'ethers';

// ── Contract ─────────────────────────────────────────────────────────────────
/** Set VITE_CONTRACT_ADDRESS in .env.local after deploying to Orchard */
export const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS as string || '';

export const MARKETPLACE_ABI = [
    'function listModel(string calldata _dataHavenHash, string calldata _modelName, uint256 _pricePerPrompt) external',
    'function rentModel(string calldata _dataHavenHash) external payable',
    'function hasAccess(address, string) external view returns (bool)',
    'function getModel(string calldata _dataHavenHash) external view returns (tuple(string dataHavenHash, address creator, string modelName, uint256 pricePerPrompt))',
    'function getModelCount() external view returns (uint256)',
    'function getModelHashAtIndex(uint256 _index) external view returns (string)',
    'event ModelListed(string indexed dataHavenHash, address indexed creator, string modelName, uint256 pricePerPrompt)',
    'event ModelRented(string indexed dataHavenHash, address indexed renter, uint256 amountPaid)',
];

// ── On-Chain Model ───────────────────────────────────────────────────────────
export interface OnChainModel {
    dataHavenHash: string;
    creator: string;
    modelName: string;
    pricePerPrompt: bigint;
    priceQuai: string;
}

// ── Showcase Models (displayed when no contract is deployed) ─────────────────
export const SHOWCASE_MODELS: OnChainModel[] = [
    {
        dataHavenHash: 'dh://QmX9aK4mNzP2rLvT8sWqBdFhGjCeUoYiI1bR3kMnVw5ZAp',
        creator: '0x007547E5eda4C78c5Aa0E8014d6a6125bB8F66d4',
        modelName: 'CodeBot v2',
        pricePerPrompt: 1000000000000000n,
        priceQuai: '0.001',
    },
    {
        dataHavenHash: 'dh://QmB7nJ2pKwL4tMxR6yNqCsFiVuHoZAeG9dQ1k8mWvTrY3Es',
        creator: '0x007547E5eda4C78c5Aa0E8014d6a6125bB8F66d4',
        modelName: 'CreativeWriter',
        pricePerPrompt: 5000000000000000n,
        priceQuai: '0.005',
    },
    {
        dataHavenHash: 'dh://QmC3fH8qLvP5nMxK9yWsAbTdGiUoJe2R7k4mBnVrY1ZwFg',
        creator: '0x007547E5eda4C78c5Aa0E8014d6a6125bB8F66d4',
        modelName: 'QuantumReason',
        pricePerPrompt: 10000000000000000n,
        priceQuai: '0.01',
    },
];

// ── Fetch all models from the contract ───────────────────────────────────────
export async function fetchAllModels(provider: ethers.BrowserProvider): Promise<OnChainModel[]> {
    if (!CONTRACT_ADDRESS) return [];

    const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_ABI, provider);

    try {
        const count = await contract.getModelCount();
        const n = Number(count);
        if (n === 0) return [];

        const models: OnChainModel[] = [];
        for (let i = 0; i < n; i++) {
            const hash = await contract.getModelHashAtIndex(i);
            const raw = await contract.getModel(hash);
            models.push({
                dataHavenHash: raw.dataHavenHash,
                creator: raw.creator,
                modelName: raw.modelName,
                pricePerPrompt: raw.pricePerPrompt,
                priceQuai: ethers.formatEther(raw.pricePerPrompt),
            });
        }
        return models;
    } catch (err) {
        console.warn('Failed to fetch models from contract:', err);
        return [];
    }
}

// ── DataHaven Upload (Pinata IPFS) ───────────────────────────────────────────
/**
 * Upload a file to DataHaven (backed by Pinata IPFS).
 * Returns a dh://... hash.
 *
 * Requires VITE_PINATA_JWT in client/.env.local
 * Free 1GB: https://app.pinata.cloud → API Keys → New Key
 */
export async function uploadToDataHaven(file: File): Promise<string> {
    const jwt = import.meta.env.VITE_PINATA_JWT as string | undefined;

    if (!jwt) {
        throw new Error('VITE_PINATA_JWT not configured. Add your Pinata API key to .env.local');
    }

    const form = new FormData();
    form.append('file', file);
    form.append('pinataMetadata', JSON.stringify({ name: file.name }));
    form.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

    const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
        method: 'POST',
        headers: { Authorization: `Bearer ${jwt}` },
        body: form,
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`DataHaven upload failed (${res.status}): ${err}`);
    }

    const { IpfsHash } = await res.json() as { IpfsHash: string };
    return `dh://${IpfsHash}`;
}
