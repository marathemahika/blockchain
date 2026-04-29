// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CarbonRewards
 * @dev Smart contract to manage user carbon credit transactions immutably
 * @notice This contract stores user details and carbon point transactions
 */

contract CarbonRewards {
    // ==================== Structs ====================
    
    struct User {
        string userId;           // Backend user ID
        string userName;         // User display name
        uint256 totalPoints;     // Total points balance
        uint256 totalCarbonReduced; // Total CO2 reduced (in kg, multiplied by 100)
        uint256 registeredAt;    // Timestamp of registration
        bool exists;             // Whether user exists in contract
    }

    struct Transaction {
        string userId;
        string txType;           // 'award' or 'redeem'
        uint256 points;
        uint256 carbonReduced;   // CO2 reduced (in kg, multiplied by 100)
        string description;
        uint256 timestamp;
        uint256 balanceAfter;
    }

    // ==================== State Variables ====================
    
    address public deployer;
    mapping(string => User) public users;        // userId => User data
    Transaction[] public transactions;           // Transaction history
    
    uint256 public totalUsersRegistered;
    uint256 public totalTransactions;

    // ==================== Events ====================
    
    event UserRegistered(
        string indexed userId,
        string userName,
        uint256 timestamp
    );

    event PointsAwarded(
        string indexed userId,
        uint256 points,
        uint256 carbonReduced,
        uint256 newBalance,
        uint256 timestamp
    );

    event PointsRedeemed(
        string indexed userId,
        uint256 points,
        uint256 newBalance,
        uint256 timestamp
    );

    // ==================== Modifiers ====================
    
    modifier onlyDeployer() {
        require(msg.sender == deployer, "Only deployer can call this function");
        _;
    }

    // ==================== Constructor ====================
    
    constructor() {
        deployer = msg.sender;
    }

    // ==================== User Management ====================
    
    /**
     * @dev Register a new user on the blockchain
     * @param _userId Unique user ID from backend
     * @param _userName User's display name
     */
    function registerUser(
        string memory _userId,
        string memory _userName
    ) public onlyDeployer {
        require(!users[_userId].exists, "User already registered");
        require(bytes(_userId).length > 0, "User ID cannot be empty");
        require(bytes(_userName).length > 0, "User name cannot be empty");

        users[_userId] = User({
            userId: _userId,
            userName: _userName,
            totalPoints: 0,
            totalCarbonReduced: 0,
            registeredAt: block.timestamp,
            exists: true
        });

        totalUsersRegistered++;

        emit UserRegistered(_userId, _userName, block.timestamp);
    }

    /**
     * @dev Get user details
     * @param _userId User ID to query
     * @return User struct with all details
     */
    function getUser(string memory _userId) 
        public 
        view 
        returns (User memory) 
    {
        require(users[_userId].exists, "User not found");
        return users[_userId];
    }

    // ==================== Points Management ====================
    
    /**
     * @dev Award carbon points to a user (called when pickup is processed)
     * @param _userId User ID
     * @param _points Points to award
     * @param _carbonReduced CO2 reduced in kg (multiplied by 100 for precision)
     * @param _description Transaction description
     */
    function awardPoints(
        string memory _userId,
        uint256 _points,
        uint256 _carbonReduced,
        string memory _description
    ) public onlyDeployer {
        require(users[_userId].exists, "User not registered");
        require(_points > 0, "Points must be greater than 0");

        User storage user = users[_userId];
        user.totalPoints += _points;
        user.totalCarbonReduced += _carbonReduced;

        Transaction memory txn = Transaction({
            userId: _userId,
            txType: "award",
            points: _points,
            carbonReduced: _carbonReduced,
            description: _description,
            timestamp: block.timestamp,
            balanceAfter: user.totalPoints
        });

        transactions.push(txn);
        totalTransactions++;

        emit PointsAwarded(
            _userId,
            _points,
            _carbonReduced,
            user.totalPoints,
            block.timestamp
        );
    }

    /**
     * @dev Redeem (deduct) carbon points from a user
     * @param _userId User ID
     * @param _points Points to redeem
     * @param _description Redemption description (e.g., reward name)
     */
    function redeemPoints(
        string memory _userId,
        uint256 _points,
        string memory _description
    ) public onlyDeployer {
        require(users[_userId].exists, "User not registered");
        require(_points > 0, "Points must be greater than 0");
        require(
            users[_userId].totalPoints >= _points,
            "Insufficient points to redeem"
        );

        User storage user = users[_userId];
        user.totalPoints -= _points;

        Transaction memory txn = Transaction({
            userId: _userId,
            txType: "redeem",
            points: _points,
            carbonReduced: 0,
            description: _description,
            timestamp: block.timestamp,
            balanceAfter: user.totalPoints
        });

        transactions.push(txn);
        totalTransactions++;

        emit PointsRedeemed(
            _userId,
            _points,
            user.totalPoints,
            block.timestamp
        );
    }

    // ==================== Query Functions ====================
    
    /**
     * @dev Get user's current points balance
     * @param _userId User ID
     * @return Current point balance
     */
    function getUserPoints(string memory _userId) 
        public 
        view 
        returns (uint256) 
    {
        require(users[_userId].exists, "User not found");
        return users[_userId].totalPoints;
    }

    /**
     * @dev Get total CO2 reduced by user
     * @param _userId User ID
     * @return Total CO2 reduced (in kg * 100)
     */
    function getUserCarbonReduced(string memory _userId) 
        public 
        view 
        returns (uint256) 
    {
        require(users[_userId].exists, "User not found");
        return users[_userId].totalCarbonReduced;
    }

    /**
     * @dev Get transaction history
     * @return Array of all transactions
     */
    function getTransactionHistory() 
        public 
        view 
        returns (Transaction[] memory) 
    {
        return transactions;
    }

    /**
     * @dev Get user's transaction history
     * @param _userId User ID
     * @return Array of user's transactions
     */
    function getUserTransactions(string memory _userId) 
        public 
        view 
        returns (Transaction[] memory) 
    {
        uint256 count = 0;
        
        // Count user's transactions
        for (uint256 i = 0; i < transactions.length; i++) {
            if (
                keccak256(abi.encodePacked(transactions[i].userId)) ==
                keccak256(abi.encodePacked(_userId))
            ) {
                count++;
            }
        }

        // Build result array
        Transaction[] memory userTxns = new Transaction[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < transactions.length; i++) {
            if (
                keccak256(abi.encodePacked(transactions[i].userId)) ==
                keccak256(abi.encodePacked(_userId))
            ) {
                userTxns[index] = transactions[i];
                index++;
            }
        }

        return userTxns;
    }

    /**
     * @dev Get transaction count
     * @return Total number of transactions
     */
    function getTransactionCount() 
        public 
        view 
        returns (uint256) 
    {
        return transactions.length;
    }

    /**
     * @dev Check if user exists
     * @param _userId User ID
     * @return Whether user exists
     */
    function userExists(string memory _userId) 
        public 
        view 
        returns (bool) 
    {
        return users[_userId].exists;
    }
}
