import { ethers } from "ethers";
import * as quais from "quais";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function main() {
    console.log("🚀 Deploying Marketplace with Hybrid Flow (Orchard)...\n");

    const rpcUrl = "https://orchard.rpc.quai.network/cyprus1";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("PRIVATE_KEY not found in .env");

    // Use quais for signing to get correct wire format
    const qWallet = new quais.Wallet(pk);
    console.log(`📋 Deployer address : ${qWallet.address}`);

    // Manual send to preserve checksum
    const balanceHex = await provider.send("eth_getBalance", [qWallet.address, "latest"]);
    const balance = ethers.toBigInt(balanceHex);
    console.log(`💰 Deployer balance : ${ethers.formatEther(balance)} QUAI\n`);

    if (balance === 0n) throw new Error("Deployer has no balance on Orchard!");

    // Load artifact
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "Marketplace.sol", "Marketplace.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

    // Prepare deployment transaction with QUAIS factory (handles address grinding for shards)
    console.log("🏗 Preparing deployment transaction with Quais factory...");
    const factory = new quais.ContractFactory(artifact.abi, artifact.bytecode, qWallet);
    const deployTx = await factory.getDeployTransaction();

    const nonceHex = await provider.send("eth_getTransactionCount", [qWallet.address, "latest"]);
    const nonce = parseInt(nonceHex, 16);
    const chainId = (await provider.getNetwork()).chainId;

    let tx = {
        from: qWallet.address,
        data: deployTx.data,
        nonce: nonce,
        gasLimit: 4000000,
        gasPrice: 2000000000, // 2 gwei
        chainId: chainId,
        type: 0
    };

    console.log("⏳ Grinding contract address for shard compliance...");
    tx = await factory.grindContractAddress(tx);

    console.log("⏳ Signing with Quais SDK...");
    const signedTx = await qWallet.signTransaction(tx);

    console.log("📡 Broadcasting raw transaction...");
    try {
        const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
        console.log(`✅ Transaction sent! Hash: ${txHash}`);

        console.log("⏳ Waiting for confirmation (this may take a minute on Orchard)...");

        // Wait for receipt
        let receipt = null;
        while (!receipt) {
            receipt = await provider.getTransactionReceipt(txHash);
            if (!receipt) {
                await new Promise(r => setTimeout(r, 5000));
                process.stdout.write(".");
            }
        }
        console.log("\n");

        if (receipt.status === 0) {
            throw new Error("Transaction reverted!");
        }

        const contractAddress = receipt.contractAddress;
        console.log("─────────────────────────────────────────────────");
        console.log(`🎊 Marketplace deployed!`);
        console.log(`📍 Contract address : ${contractAddress}`);
        console.log("─────────────────────────────────────────────────");
    } catch (e) {
        console.error("❌ Deployment failed:", e.message);
        if (e.message.includes("proto")) {
            console.error("💡 Hint: Proto error usually means serialization mismatch. Check Quai docs.");
        }
    }
}

main().catch(console.error);
