# Blockchain Implementation Guide - Step by Step

## Phase 1: Setup & Preparation

### Step 1: Install Dependencies

Make sure `ethers.js` is in your `package.json`. It should already be there:

```bash
cd ewaste-backend
npm install
```

### Step 2: Prepare Environment Variables

Create or update `.env` in `ewaste-backend/` with:

```bash
# Existing variables (keep these)
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/ewaste_platform
JWT_SECRET=your_super_secret_jwt_key_change_in_production
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=your_refresh_secret_key
JWT_REFRESH_EXPIRE=30d

# New blockchain variables
BLOCKCHAIN_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
BLOCKCHAIN_PRIVATE_KEY=your_wallet_private_key_without_0x
BLOCKCHAIN_CONTRACT_ADDRESS=0x... (will be set after deployment)
```

**Note:** Never commit `.env` to version control!

---

## Phase 2: Smart Contract Deployment

### Option A: Deploy on Sepolia Testnet (Recommended)

#### Using Remix IDE (Easiest)

1. Go to https://remix.ethereum.org
2. Create new file: `CarbonRewards.sol`
3. Copy the contract code from `src/blockchain/CarbonRewards.sol`
4. In Remix:
   - Select **Solidity Compiler** (version 0.8.19+)
   - Click **Compile CarbonRewards.sol**
   - Go to **Deploy & Run Transactions**
   - Select **Injected Web3** (connects to MetaMask)
   - Make sure you're on **Sepolia Testnet**
   - Click **Deploy**
5. Copy the deployed contract address
6. Add to `.env`:
   ```bash
   BLOCKCHAIN_CONTRACT_ADDRESS=0x... (the address from step 5)
   ```

#### Using Hardhat (For Testing)

1. Install Hardhat:
   ```bash
   npm install --save-dev hardhat @nomiclabs/hardhat-ethers ethers
   npx hardhat
   ```

2. Copy `CarbonRewards.sol` to `contracts/`

3. Create deploy script `scripts/deploy.js`:
   ```javascript
   async function main() {
     const CarbonRewards = await ethers.getContractFactory("CarbonRewards");
     const contract = await CarbonRewards.deploy();
     await contract.deployed();
     console.log("Contract deployed to:", contract.address);
   }
   main().catch((error) => {
     console.error(error);
     process.exitCode = 1;
   });
   ```

4. Deploy:
   ```bash
   npx hardhat run scripts/deploy.js --network sepolia
   ```

### Option B: Local Development (Using Hardhat Node)

```bash
# Terminal 1: Start Hardhat node
npx hardhat node

# Terminal 2: Deploy contract
npx hardhat run scripts/deploy.js --network localhost

# Set in .env:
BLOCKCHAIN_RPC_URL=http://127.0.0.1:8545
BLOCKCHAIN_PRIVATE_KEY=first_account_private_key_from_hardhat
BLOCKCHAIN_CONTRACT_ADDRESS=deployed_address_from_step_above
```

---

## Phase 3: Backend Integration

### Step 1: Copy Blockchain Files

Copy these files to your `ewaste-backend/src/` directory:

```
src/
├── blockchain/
│   ├── CarbonRewards.sol
│   └── blockchainService.js
├── controllers/
│   ├── authController.js (MODIFIED)
│   ├── pickupController.js (MODIFIED)
│   └── carbonController.js (MODIFIED)
```

### Step 2: Verify ethers.js Installation

Check `package.json` has ethers:

```bash
npm list ethers
# Should show: ethers@^5.7.0 or similar
```

If missing:
```bash
npm install ethers
```

### Step 3: Update Controllers

Replaces these files with the modified versions:

**authController.js** - Line 58 (after user creation):
```javascript
// Register user on blockchain
const blockchainService = require('../services/blockchain/blockchainService');
await blockchainService.registerUserOnChain(user._id.toString(), user.name).catch(err => {
  logger.warn(`Blockchain registration failed: ${err.message}`);
});
```

**pickupController.js** - Line 204 (when status === 'processed'):
```javascript
// Award points on blockchain
const blockchainService = require('../services/blockchain/blockchainService');
await blockchainService.awardUserPoints(
  pickup.user.toString(),
  points,
  carbonReduced
).catch(err => {
  logger.warn(`Blockchain points award failed: ${err.message}`);
});
```

**carbonController.js** - Line 150 (after points redeemed):
```javascript
// Record redemption on blockchain
const blockchainService = require('../services/blockchain/blockchainService');
await blockchainService.redeemUserPoints(
  user._id.toString(),
  reward.pointsRequired
).catch(err => {
  logger.warn(`Blockchain redemption recording failed: ${err.message}`);
});
```

---

## Phase 4: Testing & Verification

### Manual Test 1: User Registration

```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "TestPass123!",
    "phone": "9876543210",
    "role": "household"
  }'
```

✅ **Expected**: User created, check logs for:
```
User registered on blockchain: 0x... tx hash
```

### Manual Test 2: Pickup Processing

1. Create a pickup request
2. As admin/recycler, update status to `processed`
3. Check logs for:
```
Points awarded on blockchain: 100 points, 5.5 kg CO₂ reduced
```

### Manual Test 3: Point Redemption

1. User redeems points for a reward
2. Check logs for:
```
Points redeemed on blockchain: 500 points
```

### Verify on Blockchain Explorer

If using Sepolia testnet:

1. Go to https://sepolia.etherscan.io
2. Search for your contract address
3. Go to **Transactions** tab
4. You should see transaction history for:
   - User registrations
   - Point awards
   - Point redemptions

---

## Phase 5: Error Handling

The system includes **graceful degradation**:

- ✅ Missing `.env` blockchain variables → logged as warning, app continues
- ✅ RPC connection fails → logged as warning, app continues
- ✅ Transaction fails → logged as warning, app continues
- ✅ User gets credit in DB regardless of blockchain status

Check logs:
```bash
npm run dev
# Look for blockchain-related messages
```

---

## Phase 6: Troubleshooting

### Issue: "BLOCKCHAIN_RPC_URL not set"

**Solution**: Add to `.env` and restart app

### Issue: "Invalid private key"

**Solution**: Make sure private key:
- Is from testnet account with ETH balance
- Doesn't include '0x' prefix in `.env`
- Has enough ETH for gas (~0.01 ETH per transaction)

### Issue: Transaction reverted

**Solution**: Check contract address is correct and deployed on same network as RPC_URL

### Issue: Transactions too slow

**Solution**: That's normal for testnet. Use local Hardhat node for instant transactions.

---

## File Reference

| File | Purpose | Status |
|------|---------|--------|
| `src/blockchain/CarbonRewards.sol` | Smart contract | NEW |
| `src/blockchain/blockchainService.js` | Service layer | NEW |
| `src/controllers/authController.js` | User registration | MODIFIED |
| `src/controllers/pickupController.js` | Points award | MODIFIED |
| `src/controllers/carbonController.js` | Points redemption | MODIFIED |
| `.env.example` | Configuration | MODIFIED |

---

## Next Steps

1. ✅ Deploy smart contract
2. ✅ Update `.env` with contract address
3. ✅ Copy blockchain files
4. ✅ Update controllers
5. ✅ Run manual tests
6. ✅ Verify on blockchain explorer
7. ✅ Commit & push to main repo

---

**Need help?** Check the logs:
```bash
grep -i blockchain logs/*.log
```
