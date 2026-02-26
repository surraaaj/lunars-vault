import { ethers } from "ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function main() {
    console.log("🚀 Deploying Marketplace (pure ethers)...\n");

    const rpcUrl = "https://orchard.rpc.quai.network/cyprus1";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("PRIVATE_KEY not found in .env");

    const wallet = new ethers.Wallet(pk, provider);
    console.log(`📋 Deployer: ${wallet.address}`);

    const balance = await provider.getBalance(wallet.address);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} QUAI\n`);

    if (balance === 0n) throw new Error("No balance!");

    // Load artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "Marketplace.sol", "Marketplace.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    console.log(`📦 Bytecode length: ${artifact.bytecode.length} chars`);
    console.log(`📦 ABI functions: ${artifact.abi.filter(x => x.type === 'function').length}\n`);

    // Deploy with ethers ContractFactory
    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    console.log("⏳ Deploying...");
    try {
        const contract = await factory.deploy({
            gasLimit: 5000000,
        });

        console.log(`📡 TX hash: ${contract.deploymentTransaction()?.hash}`);
        console.log("⏳ Waiting for confirmation...");

        await contract.waitForDeployment();

        const addr = await contract.getAddress();
        console.log("\n─────────────────────────────────────────────────");
        console.log(`🎊 Marketplace deployed!`);
        console.log(`📍 Contract address : ${addr}`);
        console.log("─────────────────────────────────────────────────");
    } catch (e) {
        console.error("❌ Deploy failed:", e.message);

        // Try to get more details
        if (e.receipt) {
            console.log("\n📋 Receipt:", JSON.stringify(e.receipt, null, 2));
        }
        if (e.transaction) {
            console.log("\n📋 TX:", JSON.stringify({
                hash: e.transaction.hash,
                from: e.transaction.from,
                to: e.transaction.to,
                gasLimit: e.transaction.gasLimit?.toString(),
                data: e.transaction.data?.slice(0, 100) + "...",
            }, null, 2));
        }
    }
}

main().catch(console.error);
