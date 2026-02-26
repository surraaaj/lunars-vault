import { ethers } from "ethers";
import * as quais from "quais";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "..", ".env") });

async function main() {
    console.log("🚀 Deploying Marketplace (Hybrid: ethers RPC + quais signing)...\n");

    const rpcUrl = "https://orchard.rpc.quai.network/cyprus1";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const pk = process.env.PRIVATE_KEY;
    if (!pk) throw new Error("PRIVATE_KEY not found in .env");

    const qWallet = new quais.Wallet(pk);
    console.log(`📋 Deployer: ${qWallet.address}`);

    const balanceHex = await provider.send("eth_getBalance", [qWallet.address, "latest"]);
    const balance = ethers.toBigInt(balanceHex);
    console.log(`💰 Balance: ${ethers.formatEther(balance)} QUAI\n`);

    if (balance === 0n) throw new Error("No balance!");

    // Load artifact (compiled with evmVersion: london)
    const artifactPath = path.join(__dirname, "..", "artifacts", "contracts", "Marketplace.sol", "Marketplace.json");
    const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
    console.log(`📦 Bytecode: ${artifact.bytecode.length} chars (london EVM)`);

    // Use quais ContractFactory for shard-compliant address grinding
    const factory = new quais.ContractFactory(artifact.abi, artifact.bytecode, qWallet);
    const deployTx = await factory.getDeployTransaction();

    const nonceHex = await provider.send("eth_getTransactionCount", [qWallet.address, "latest"]);
    const nonce = parseInt(nonceHex, 16);
    const chainId = (await provider.getNetwork()).chainId;

    let tx = {
        from: qWallet.address,
        data: deployTx.data,
        nonce: nonce,
        gasLimit: 5000000,
        gasPrice: 2000000000,
        chainId: chainId,
        type: 0
    };

    console.log("⏳ Grinding address for shard compliance...");
    tx = await factory.grindContractAddress(tx);

    console.log("⏳ Signing...");
    const signedTx = await qWallet.signTransaction(tx);

    console.log("📡 Broadcasting...");
    try {
        const txHash = await provider.send("eth_sendRawTransaction", [signedTx]);
        console.log(`✅ TX: ${txHash}`);
        console.log("⏳ Waiting for confirmation...\n");

        let receipt = null;
        for (let i = 0; i < 60; i++) {
            receipt = await provider.getTransactionReceipt(txHash);
            if (receipt) break;
            await new Promise(r => setTimeout(r, 5000));
            process.stdout.write(".");
        }

        if (!receipt) {
            console.log("\n⏰ Timed out waiting. TX hash:", txHash);
            console.log("Check back later — the contract may still deploy.");
            return;
        }

        console.log("\n");
        if (receipt.status === 0) {
            console.log("❌ Transaction reverted!");
            console.log("Gas used:", receipt.gasUsed.toString());
            console.log("Block:", receipt.blockNumber);
            return;
        }

        const addr = receipt.contractAddress;
        console.log("─────────────────────────────────────────────────");
        console.log(`🎊 Marketplace deployed!`);
        console.log(`📍 Contract address : ${addr}`);
        console.log("─────────────────────────────────────────────────");
        console.log(`\nAdd to client/.env.local:`);
        console.log(`VITE_CONTRACT_ADDRESS=${addr}`);
    } catch (e) {
        console.error("❌ Failed:", e.message);
    }
}

main().catch(console.error);
