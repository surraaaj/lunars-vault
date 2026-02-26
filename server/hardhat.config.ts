import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, ".env") });

const PRIVATE_KEY =
    process.env.PRIVATE_KEY ||
    "0x0000000000000000000000000000000000000000000000000000000000000001";

export default defineConfig({
    plugins: [hardhatEthers],
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        /** Quai Cyprus-1 Testnet */
        quai_testnet: {
            type: "http",
            url: "https://orchard.rpc.quai.network/cyprus1",
            chainId: 15000,
            accounts: [PRIVATE_KEY],
        },
        localhost: {
            type: "http",
            url: "http://127.0.0.1:8545",
            chainId: 31337,
        },
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./cache",
        artifacts: "./artifacts",
    },
});
