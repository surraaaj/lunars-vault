import { ethers } from 'ethers';

// ── Contract ─────────────────────────────────────────────────────────────────
/** Replace with your deployed address after: npx hardhat run scripts/deploy.js --network quai_testnet */
export const CONTRACT_ADDRESS = '0x5FbDB2315678afecb367f032d93F642f64180aa3';

export const MARKETPLACE_ABI = [
    'function listModel(string calldata _dataHavenHash, string calldata _modelName, uint256 _pricePerPrompt) external',
    'function rentModel(string calldata _dataHavenHash) external payable',
    'function hasAccess(address, string) external view returns (bool)',
    'function getModel(string calldata _dataHavenHash) external view returns (tuple(string dataHavenHash, address creator, string modelName, uint256 pricePerPrompt))',
    'event ModelListed(string indexed dataHavenHash, address indexed creator, string modelName, uint256 pricePerPrompt)',
    'event ModelRented(string indexed dataHavenHash, address indexed renter, uint256 amountPaid)',
];

// ── Chain ─────────────────────────────────────────────────────────────────────
export const QUAI_CHAIN_ID = 9000;

// ── Mock Models ───────────────────────────────────────────────────────────────
export interface MockModel {
    id: string;
    name: string;
    description: string;
    priceQuai: string;
    priceWei: bigint;
    dataHavenHash: string;
    category: string;
    mockCreator: string;
}

export const MOCK_MODELS: MockModel[] = [
    {
        id: '1',
        name: 'CodeBot v2',
        description: 'Expert full-stack code generator. Supports 40+ languages with architecture suggestions.',
        priceQuai: '0.001',
        priceWei: ethers.parseEther('0.001'),
        dataHavenHash: 'dh://QmX9aK4mNzP2rLvT8sWqBdFhGjCeUoYiI1bR3kMnVw5ZAp',
        category: 'Code Generation',
        mockCreator: '0xdEaD...bEeF',
    },
    {
        id: '2',
        name: 'CreativeWriter',
        description: 'Powerful creative writing LLM. Generates stories, scripts, and marketing copy.',
        priceQuai: '0.005',
        priceWei: ethers.parseEther('0.005'),
        dataHavenHash: 'dh://QmB7nJ2pKwL4tMxR6yNqCsFiVuHoZAeG9dQ1k8mWvTrY3Es',
        category: 'Creative AI',
        mockCreator: '0xCafe...1234',
    },
    {
        id: '3',
        name: 'QuantumReason',
        description: 'Advanced reasoning model. Multi-step logic, math proofs, and scientific analysis.',
        priceQuai: '0.01',
        priceWei: ethers.parseEther('0.01'),
        dataHavenHash: 'dh://QmC3fH8qLvP5nMxK9yWsAbTdGiUoJe2R7k4mBnVrY1ZwFg',
        category: 'Reasoning',
        mockCreator: '0xAbcd...5678',
    },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Upload a file to DataHaven (backed by Pinata IPFS when key is set).
 * Returns a dh://Qm... hash — real IPFS CID or a deterministic mock.
 *
 * Set VITE_PINATA_JWT in client/.env.local for real storage.
 * Free 1GB: https://app.pinata.cloud → API Keys → New Key
 */
export async function uploadToDataHaven(file: File): Promise<string> {
    const jwt = import.meta.env.VITE_PINATA_JWT as string | undefined;

    if (jwt) {
        // ── Real upload to Pinata IPFS ────────────────────────────────────
        const form = new FormData();
        form.append('file', file);
        form.append(
            'pinataMetadata',
            JSON.stringify({ name: file.name })
        );
        form.append(
            'pinataOptions',
            JSON.stringify({ cidVersion: 1 })
        );

        const res = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
            method: 'POST',
            headers: { Authorization: `Bearer ${jwt}` },
            body: form,
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Pinata upload failed (${res.status}): ${err}`);
        }

        const { IpfsHash } = await res.json() as { IpfsHash: string };
        // Keep the DataHaven dh:// branding in the UI
        return `dh://${IpfsHash}`;
    }

    // ── Fallback: deterministic mock hash (no key set) ────────────────────────
    await new Promise((res) => setTimeout(res, 2000));
    const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `dh://Qm${rand}${file.name.replace(/\W/g, '').slice(0, 6)}DataHaven`;
}

// (MOCK_RESPONSES removed — real AI responses via Groq in Marketplace.tsx)

