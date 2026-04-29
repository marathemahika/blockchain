# Blockchain Implementation for E-Waste Carbon Credits

This is a preview implementation of the blockchain layer for the E-Waste Tracking platform. It introduces an Ethereum-based smart contract to securely and immutably store user details and carbon credit transactions.

## 📋 Overview

This implementation adds a blockchain layer without modifying the existing MongoDB logic. It maintains a dual ledger system:
- **MongoDB**: Traditional database for application logic
- **Blockchain**: Immutable record of all carbon transactions

## 🏗️ Architecture

### Components

1. **Smart Contract** (`src/blockchain/CarbonRewards.sol`)
   - Solidity contract deployed on Ethereum/testnet
   - Manages user registration and point transactions

2. **Blockchain Service** (`src/blockchain/blockchainService.js`)
   - Node.js service layer using ethers.js
   - Handles contract interactions
   - Implements error handling and graceful degradation

3. **Controller Modifications**
   - `authController.js` - Register users on blockchain
   - `pickupController.js` - Award points when pickup processed
   - `carbonController.js` - Record point redemptions

## 🚀 Quick Start

### Prerequisites
- Node.js v14+
- ethers.js (already in package.json)
- Ethereum testnet RPC URL (Alchemy, Infura, or local Hardhat node)
- Wallet private key for contract deployment

### Setup

1. **Install dependencies**
   ```bash
   cd ewaste-backend
   npm install
   ```

2. **Configure environment** (update `.env`)
   ```bash
   BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_KEY
   BLOCKCHAIN_PRIVATE_KEY=your_wallet_private_key
   BLOCKCHAIN_CONTRACT_ADDRESS=deployed_contract_address
   ```

3. **Deploy Smart Contract**
   - Use Remix IDE or Hardhat
   - Deploy `src/blockchain/CarbonRewards.sol`
   - Get the contract address and add to `.env`

4. **Start application**
   ```bash
   npm run dev
   ```

## 📝 API Changes

No API changes - blockchain calls happen in the background:

- **User Registration**: Automatically registers on blockchain
- **Pickup Processing**: Awards points on both DB and blockchain
- **Point Redemption**: Records redemption on-chain

## 🔐 Security Features

- ✅ Access control (only deployer can mint/redeem)
- ✅ Event logging for all transactions
- ✅ Graceful error handling
- ✅ No sensitive data on-chain

## 🛠️ File Structure

```
ewaste-backend/
├── src/
│   ├── blockchain/
│   │   ├── CarbonRewards.sol          (Smart Contract)
│   │   └── blockchainService.js       (Service Layer)
│   ├── controllers/
│   │   ├── authController.js          (Modified)
│   │   ├── pickupController.js        (Modified)
│   │   └── carbonController.js        (Modified)
│   └── ...
├── .env.example                        (Updated)
└── package.json                        (ethers already present)
```

## 📚 Documentation

See `IMPLEMENTATION_GUIDE.md` for detailed step-by-step instructions.

## ⚠️ Important Notes

- The blockchain layer is **optional** - app works fine without it
- Missing `.env` blockchain variables won't crash the app
- All transactions are logged for debugging
- Contract deployment requires gas (testnet ETH)

## 🤝 Next Steps

1. Review all files in this repository
2. Deploy smart contract on testnet
3. Test with the provided verification plan
4. Merge to main E-waste_tracking repository

---

**For detailed implementation steps, see `IMPLEMENTATION_GUIDE.md`**
