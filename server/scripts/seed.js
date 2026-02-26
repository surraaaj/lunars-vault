// Hardhat v3 seed script — lists mock models on-chain so frontend works immediately
import { network } from "hardhat";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

const MARKETPLACE_ABI = [
    "function listModel(string calldata _dataHavenHash, string calldata _modelName, uint256 _pricePerPrompt) external",
];

const MOCK_MODELS = [
    {
        name: "CodeBot v2",
        price: "0.001",
        hash: "dh://QmX9aK4mNzP2rLvT8sWqBdFhGjCeUoYiI1bR3kMnVw5ZAp",
    },
    {
        name: "CreativeWriter",
        price: "0.005",
        hash: "dh://QmB7nJ2pKwL4tMxR6yNqCsFiVuHoZAeG9dQ1k8mWvTrY3Es",
    },
    {
        name: "QuantumReason",
        price: "0.01",
        hash: "dh://QmC3fH8qLvP5nMxK9yWsAbTdGiUoJe2R7k4mBnVrY1ZwFg",
    },
];

async function main() {
    const { ethers: hre } = await network.connect();

    const [deployer] = await hre.getSigners();
    console.log(`🌱 Seeding from: ${deployer.address}\n`);

    const contract = new ethers.Contract(CONTRACT_ADDRESS, MARKETPLACE_ABI, deployer);

    for (const model of MOCK_MODELS) {
        console.log(`  Listing "${model.name}"...`);
        const tx = await contract.listModel(
            model.hash,
            model.name,
            ethers.parseEther(model.price)
        );
        await tx.wait();
        console.log(`  ✅ Listed — hash: ${model.hash.slice(0, 30)}...`);
    }

    console.log("\n🎉 All mock models seeded on-chain!");
    console.log("   Frontend is ready to use.\n");
}

main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.error("❌ Seed failed:", e.message);
        process.exit(1);
    });
