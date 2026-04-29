const { ethers } = require('ethers');
const logger = require('../utils/logger');

// Smart Contract ABI (minimal - only functions we use)
const CONTRACT_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "_userId", "type": "string"}, {"internalType": "string", "name": "_userName", "type": "string"}],
    "name": "registerUser",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_userId", "type": "string"}, {"internalType": "uint256", "name": "_points", "type": "uint256"}, {"internalType": "uint256", "name": "_carbonReduced", "type": "uint256"}, {"internalType": "string", "name": "_description", "type": "string"}],
    "name": "awardPoints",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_userId", "type": "string"}, {"internalType": "uint256", "name": "_points", "type": "uint256"}, {"internalType": "string", "name": "_description", "type": "string"}],
    "name": "redeemPoints",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "string", "name": "_userId", "type": "string"}],
    "name": "getUser",
    "outputs": [{"components": [{"internalType": "string", "name": "userId", "type": "string"}, {"internalType": "string", "name": "userName", "type": "string"}, {"internalType": "uint256", "name": "totalPoints", "type": "uint256"}, {"internalType": "uint256", "name": "totalCarbonReduced", "type": "uint256"}, {"internalType": "uint256", "name": "registeredAt", "type": "uint256"}, {"internalType": "bool", "name": "exists", "type": "bool"}], "internalType": "struct CarbonRewards.User", "name": "", "type": "tuple"}],
    "stateMutability": "view",
    "type": "function"
  }
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.signer = null;
    this.contract = null;
    this.isInitialized = false;
    this.initializeProvider();
  }

  /**
   * Initialize blockchain provider and contract connection
   * Gracefully handles missing configuration
   */
  initializeProvider() {
    try {
      const rpcUrl = process.env.BLOCKCHAIN_RPC_URL;
      const privateKey = process.env.BLOCKCHAIN_PRIVATE_KEY;
      const contractAddress = process.env.BLOCKCHAIN_CONTRACT_ADDRESS;

      // Check if all required variables are set
      if (!rpcUrl || !privateKey || !contractAddress) {
        logger.info('⚠️  Blockchain configuration incomplete. Blockchain features disabled.');
        logger.debug(`RPC URL set: ${!!rpcUrl}, Private Key set: ${!!privateKey}, Contract Address set: ${!!contractAddress}`);
        this.isInitialized = false;
        return;
      }

      // Initialize provider
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
      
      // Initialize signer with private key
      this.signer = new ethers.Wallet(privateKey, this.provider);
      
      // Initialize contract instance
      this.contract = new ethers.Contract(contractAddress, CONTRACT_ABI, this.signer);
      
      this.isInitialized = true;
      logger.info('✅ Blockchain service initialized successfully');
    } catch (error) {
      logger.warn(`⚠️  Failed to initialize blockchain service: ${error.message}`);
      this.isInitialized = false;
    }
  }

  /**
   * Check if blockchain service is ready
   * @returns {boolean} Whether blockchain is initialized
   */
  isReady() {
    return this.isInitialized && this.contract !== null;
  }

  /**
   * Register a new user on the blockchain
   * Called when a user creates an account
   * 
   * @param {string} userId - User's MongoDB ID
   * @param {string} userName - User's name
   * @returns {Promise<string>} Transaction hash or null if failed
   */
  async registerUserOnChain(userId, userName) {
    try {
      if (!this.isReady()) {
        logger.debug('Blockchain not available, skipping user registration on-chain');
        return null;
      }

      logger.info(`📝 Registering user on blockchain: ${userId}`);
      
      // Call smart contract
      const tx = await this.contract.registerUser(userId, userName);
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      
      logger.info(`✅ User registered on blockchain. Tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      logger.error(`❌ Failed to register user on blockchain: ${error.message}`);
      // Don't throw - let app continue
      return null;
    }
  }

  /**
   * Award carbon points to a user
   * Called when a pickup is marked as processed
   * 
   * @param {string} userId - User's MongoDB ID
   * @param {number} points - Points to award
   * @param {number} carbonReduced - CO2 reduced in kg
   * @returns {Promise<string>} Transaction hash or null if failed
   */
  async awardUserPoints(userId, points, carbonReduced) {
    try {
      if (!this.isReady()) {
        logger.debug('Blockchain not available, skipping points award on-chain');
        return null;
      }

      logger.info(`💰 Awarding points on blockchain: ${userId} | ${points} points | ${carbonReduced} kg CO₂`);
      
      // Convert carbon reduced to integer (multiply by 100 for precision)
      const carbonReducedScaled = Math.round(carbonReduced * 100);
      const description = `Carbon points earned from pickup`;

      const tx = await this.contract.awardPoints(
        userId,
        points,
        carbonReducedScaled,
        description
      );

      const receipt = await tx.wait();
      
      logger.info(`✅ Points awarded on blockchain. Tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      logger.error(`❌ Failed to award points on blockchain: ${error.message}`);
      // Don't throw - let app continue
      return null;
    }
  }

  /**
   * Redeem (deduct) carbon points from a user
   * Called when a user redeems a reward
   * 
   * @param {string} userId - User's MongoDB ID
   * @param {number} points - Points to redeem
   * @param {string} rewardName - Name of reward being redeemed
   * @returns {Promise<string>} Transaction hash or null if failed
   */
  async redeemUserPoints(userId, points, rewardName = 'Reward') {
    try {
      if (!this.isReady()) {
        logger.debug('Blockchain not available, skipping points redemption on-chain');
        return null;
      }

      logger.info(`🎁 Redeeming points on blockchain: ${userId} | ${points} points | ${rewardName}`);
      
      const description = `Redeemed: ${rewardName}`;

      const tx = await this.contract.redeemPoints(userId, points, description);
      const receipt = await tx.wait();
      
      logger.info(`✅ Points redeemed on blockchain. Tx: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      logger.error(`❌ Failed to redeem points on blockchain: ${error.message}`);
      // Don't throw - let app continue
      return null;
    }
  }

  /**
   * Get user's blockchain data
   * 
   * @param {string} userId - User's MongoDB ID
   * @returns {Promise<Object>} User data from blockchain or null
   */
  async getBlockchainUser(userId) {
    try {
      if (!this.isReady()) {
        return null;
      }

      const user = await this.contract.getUser(userId);
      return {
        userId: user.userId,
        userName: user.userName,
        totalPoints: user.totalPoints.toString(),
        totalCarbonReduced: (user.totalCarbonReduced / 100).toString(), // Unscale from 100x
        registeredAt: new Date(user.registeredAt * 1000),
        exists: user.exists
      };
    } catch (error) {
      logger.debug(`Could not fetch user from blockchain: ${error.message}`);
      return null;
    }
  }

  /**
   * Get user's current points balance from blockchain
   * 
   * @param {string} userId - User's MongoDB ID
   * @returns {Promise<number>} Current point balance or null
   */
  async getUserBlockchainBalance(userId) {
    try {
      if (!this.isReady()) {
        return null;
      }

      const user = await this.contract.getUser(userId);
      return user.totalPoints.toNumber();
    } catch (error) {
      logger.debug(`Could not fetch points from blockchain: ${error.message}`);
      return null;
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;
