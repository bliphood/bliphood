// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/// @title BlipHoodV1 — Puzzle Mining with Native ETH Payment
/// @notice Solves keccak256("BLIPHOOD_PUZZLE_SEED" + seed + nonce) with N leading zero bytes.
///         Pay with native ETH (msg.value). Adaptive difficulty, halving, on-chain stats.
contract BlipHoodV1 {
    // ═══════════════════════════════════════════════════════
    // ERC20 State
    // ═══════════════════════════════════════════════════════
    string public constant name     = "BlipHood";
    string public constant symbol   = "BLIPHD";
    uint8  public constant decimals = 18;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    function _transfer(address from, address to, uint256 value) internal {
        require(from != address(0), "ERC20: transfer from zero");
        require(to != address(0), "ERC20: transfer to zero");
        uint256 fromBal = balanceOf[from];
        require(fromBal >= value, "ERC20: insufficient balance");
        unchecked { balanceOf[from] = fromBal - value; }
        balanceOf[to] += value;
        emit Transfer(from, to, value);
    }

    function transfer(address to, uint256 value) external returns (bool) {
        _transfer(msg.sender, to, value);
        return true;
    }

    function approve(address spender, uint256 value) external returns (bool) {
        allowance[msg.sender][spender] = value;
        emit Approval(msg.sender, spender, value);
        return true;
    }

    function transferFrom(address from, address to, uint256 value) external returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) {
            require(allowed >= value, "ERC20: insufficient allowance");
            unchecked { allowance[from][msg.sender] = allowed - value; }
        }
        _transfer(from, to, value);
        return true;
    }

    function _mint(address to, uint256 value) internal {
        require(to != address(0), "ERC20: mint to zero");
        totalSupply += value;
        balanceOf[to] += value;
        emit Transfer(address(0), to, value);
    }

    // ═══════════════════════════════════════════════════════
    // Ownable
    // ═══════════════════════════════════════════════════════
    address public owner;
    event OwnershipTransferred(address indexed prev, address indexed next);

    modifier onlyOwner() { require(msg.sender == owner, "Ownable: not owner"); _; }

    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Ownable: zero address");
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    function renounceOwnership() external onlyOwner {
        emit OwnershipTransferred(owner, address(0));
        owner = address(0);
    }

    // ═══════════════════════════════════════════════════════
    // Puzzle Constants
    // ═══════════════════════════════════════════════════════
    bytes32 public constant PUZZLE_PREFIX = keccak256("BLIPHOOD_PUZZLE_SEED");
    uint256 public constant MAX_SUPPLY    = 1_000_000_000 * 1e18;
    uint8   public constant MIN_DIFFICULTY = 3;
    uint8   public constant MAX_DIFFICULTY = 8;

    // ═══════════════════════════════════════════════════════
    // Supply Allocations
    // ═══════════════════════════════════════════════════════
    uint256 public constant LP_ALLOCATION  = 50_000_000 * 1e18;   // 5%
    uint256 public constant DEV_ALLOCATION = 50_000_000 * 1e18;   // 5%
    uint256 public constant MINEABLE_MAX   = MAX_SUPPLY - LP_ALLOCATION - DEV_ALLOCATION; // 900M (90%)

    uint256 public lpMinted;
    uint256 public devMinted;

    event LPMinted(address indexed to, uint256 amount);
    event DevMinted(address indexed to, uint256 amount);

    // ═══════════════════════════════════════════════════════
    // Burn Mechanism (voluntary)
    // ═══════════════════════════════════════════════════════
    uint256 public totalBurned;
    event Burn(address indexed burner, uint256 amount);

    function burn(uint256 amount) external {
        require(amount > 0, "Zero amount");
        require(balanceOf[msg.sender] >= amount, "Insufficient balance");
        unchecked { balanceOf[msg.sender] -= amount; }
        totalSupply -= amount;
        totalBurned += amount;
        emit Transfer(msg.sender, address(0), amount);
        emit Burn(msg.sender, amount);
    }

    // ═══════════════════════════════════════════════════════
    // Halving Schedule (4 eras, fixed amounts)
    // ═══════════════════════════════════════════════════════
    uint256 public constant HALVING_INTERVAL = 100_000_000 * 1e18;
    uint256 public mintCost = 0.001 ether; // owner-configurable

    uint256[4] private HALVING_AMOUNTS = [
        20_000 * 1e18,  // Era 0: 0–100M
        15_000 * 1e18,  // Era 1: 100M–200M
        10_000 * 1e18,  // Era 2: 200M–300M
        5_000 * 1e18    // Era 3: 300M+
    ];

    function currentMintAmount() public view returns (uint256) {
        uint256 mined = totalSupply - lpMinted - devMinted;
        uint256 era = mined / HALVING_INTERVAL;
        if (era >= 4) return HALVING_AMOUNTS[3];
        return HALVING_AMOUNTS[era];
    }

    function currentHalvingEra() public view returns (uint256) {
        uint256 mined = totalSupply - lpMinted - devMinted;
        uint256 era = mined / HALVING_INTERVAL;
        return era > 3 ? 3 : era;
    }

    function remainingSupply() public view returns (uint256) {
        uint256 minableMinted = totalSupply - lpMinted - devMinted;
        return minableMinted >= MINEABLE_MAX ? 0 : MINEABLE_MAX - minableMinted;
    }

    // ═══════════════════════════════════════════════════════
    // Puzzle State
    // ═══════════════════════════════════════════════════════
    bytes32 public currentPuzzleSeed;
    uint8   public currentDifficulty = 3;
    bool    public mintingEnabled = true;

    event Minted(address indexed to, uint256 amount, uint256 nonce, bytes32 indexed newSeed);
    event NewPuzzleSeed(bytes32 indexed newSeed);
    event MintingToggled(bool enabled);
    event ETHWithdrawn(address indexed to, uint256 amount);
    event DifficultyAdjusted(uint8 oldDiff, uint8 newDiff, uint256 avgMs);
    event RandomDifficultyEvent(uint8 difficulty, uint256 bonusMultiplier, uint256 reward);

    // ═══════════════════════════════════════════════════════
    // Adaptive Difficulty
    // ═══════════════════════════════════════════════════════
    uint256 public constant DIFFICULTY_WINDOW = 10;
    uint256 public constant TARGET_SOLVE_SEC  = 30;

    uint256[10] private _solveGaps;
    uint8       private _solveIdx;
    uint256     private _solveCount;
    uint256     private _lastSolveTimestamp;

    function _recordSolveGap() internal {
        uint256 gap = 0;
        if (_lastSolveTimestamp > 0) {
            gap = block.timestamp - _lastSolveTimestamp;
        }
        _lastSolveTimestamp = block.timestamp;

        _solveGaps[_solveIdx % DIFFICULTY_WINDOW] = gap;
        _solveIdx++;
        if (_solveCount < DIFFICULTY_WINDOW) _solveCount++;

        if (_solveCount >= DIFFICULTY_WINDOW) {
            uint256 sum = 0;
            for (uint8 i = 0; i < DIFFICULTY_WINDOW; i++) { sum += _solveGaps[i]; }
            uint256 avg = sum / DIFFICULTY_WINDOW;
            uint8 oldDiff = currentDifficulty;

            if (avg < TARGET_SOLVE_SEC / 2 && currentDifficulty < MAX_DIFFICULTY) {
                currentDifficulty++;
            } else if (avg > TARGET_SOLVE_SEC * 2 && currentDifficulty > MIN_DIFFICULTY) {
                currentDifficulty--;
            }

            if (oldDiff != currentDifficulty) {
                emit DifficultyAdjusted(oldDiff, currentDifficulty, avg);
            }
        }
    }

    // ═══════════════════════════════════════════════════════
    // Random Difficulty (jackpot event)
    // ═══════════════════════════════════════════════════════
    uint256 public randomChance   = 25;   // 0.25% per mint (basis points)
    uint8   public randomDifficulty = 8;
    uint256 public randomBonus     = 300; // 3x reward

    struct MinerStats {
        uint256 totalSolved;
        uint256 totalBlipEarned;
        uint256 totalEthSpent;
        uint256 lastSolveTime;
        uint256 currentStreak;
        uint256 bestStreak;
    }

    mapping(address => MinerStats) public minerStats;

    function getMinerStats(address miner) external view returns (MinerStats memory) {
        return minerStats[miner];
    }

    uint256 public constant STREAK_WINDOW = 1 hours;

    function _updateStreak(address miner) internal {
        MinerStats storage ms = minerStats[miner];
        if (ms.lastSolveTime > 0 && block.timestamp - ms.lastSolveTime <= STREAK_WINDOW) {
            ms.currentStreak++;
        } else {
            ms.currentStreak = 1;
        }
        if (ms.currentStreak > ms.bestStreak) {
            ms.bestStreak = ms.currentStreak;
        }
        ms.lastSolveTime = block.timestamp;
    }

    function streakBonus(address miner) public view returns (uint256) {
        uint256 streak = minerStats[miner].currentStreak;
        if (streak <= 1) return 0;
        uint256 bonus = (streak - 1) * 100;
        if (bonus > 1000) bonus = 1000;
        return bonus;
    }

    // ═══════════════════════════════════════════════════════
    // Puzzle Verification (public pure)
    // ═══════════════════════════════════════════════════════
    function verifyPuzzle(bytes32 seed, uint256 nonce, uint8 difficulty)
        public pure returns (bool)
    {
        bytes32 hash = keccak256(abi.encodePacked(PUZZLE_PREFIX, seed, nonce));
        for (uint8 i = 0; i < difficulty; i++) {
            if (hash[i] != 0) return false;
        }
        return true;
    }

    function _generateNewSeed(bytes32 prevSeed, uint256 nonce) internal view returns (bytes32) {
        return keccak256(abi.encodePacked(prevSeed, nonce, block.prevrandao));
    }

    // ═══════════════════════════════════════════════════════
    // Mint (payable — native ETH)
    // ═══════════════════════════════════════════════════════
    function solveAndMint(uint256 nonce) external payable {
        require(msg.value >= mintCost, "Insufficient ETH sent");
        _mintReward(msg.sender, nonce);
    }

    function _mintReward(address miner, uint256 nonce) internal {
        require(mintingEnabled, "Minting disabled");
        require(currentPuzzleSeed != 0, "Seed not initialized");

        uint256 mintAmount = currentMintAmount();
        require(mintAmount > 0, "Fully mined");
        require(remainingSupply() >= mintAmount, "Max supply exceeded");

        uint8 puzzleDifficulty = currentDifficulty;
        uint256 bonusMultiplier = 100;

        if (randomChance > 0) {
            uint256 roll = uint256(keccak256(abi.encodePacked(nonce, block.prevrandao, block.timestamp))) % 10000;
            if (roll < randomChance) {
                puzzleDifficulty = randomDifficulty;
                bonusMultiplier = randomBonus;
                mintAmount = (mintAmount * bonusMultiplier) / 100;
                if (remainingSupply() < mintAmount) mintAmount = remainingSupply();
                emit RandomDifficultyEvent(puzzleDifficulty, bonusMultiplier, mintAmount);

                if (currentDifficulty < MAX_DIFFICULTY) {
                    uint8 oldDiff = currentDifficulty;
                    currentDifficulty++;
                    emit DifficultyAdjusted(oldDiff, currentDifficulty, 0);
                }
            }
        }

        require(verifyPuzzle(currentPuzzleSeed, nonce, puzzleDifficulty), "Puzzle not solved");

        _updateStreak(miner);
        uint256 bonus = streakBonus(miner);
        uint256 totalMint = mintAmount;
        if (bonus > 0) {
            totalMint = mintAmount + (mintAmount * bonus) / 10000;
            if (remainingSupply() < totalMint) totalMint = remainingSupply();
        }

        _mint(miner, totalMint);

        MinerStats storage ms = minerStats[miner];
        ms.totalSolved++;
        ms.totalBlipEarned += totalMint;
        ms.totalEthSpent += msg.value;

        bytes32 newSeed = _generateNewSeed(currentPuzzleSeed, nonce);
        currentPuzzleSeed = newSeed;

        _recordSolveGap();

        emit Minted(miner, totalMint, nonce, newSeed);
        emit NewPuzzleSeed(newSeed);
    }

    // ═══════════════════════════════════════════════════════
    // View Helpers
    // ═══════════════════════════════════════════════════════
    function getCurrentPuzzleSeed() external view returns (bytes32) {
        return currentPuzzleSeed;
    }

    function PUZZLE_BYTE_PREFIX() external view returns (uint8) {
        return currentDifficulty;
    }

    function MINT_AMOUNT() external view returns (uint256) {
        return currentMintAmount();
    }

    function getMintingInfo() external view returns (
        bytes32 seed,
        uint8   difficulty,
        uint256 mintAmount,
        uint256 costWei,
        uint256 remaining,
        uint256 era,
        bool    enabled,
        uint256 totalMinted,
        uint256 lpSupply,
        uint256 devSupply
    ) {
        return (
            currentPuzzleSeed,
            currentDifficulty,
            currentMintAmount(),
            mintCost,
            remainingSupply(),
            currentHalvingEra(),
            mintingEnabled,
            totalSupply,
            lpMinted,
            devMinted
        );
    }

    // ═══════════════════════════════════════════════════════
    // Admin
    // ═══════════════════════════════════════════════════════
    function mintLP(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        require(lpMinted + amount <= LP_ALLOCATION, "LP allocation exceeded");
        lpMinted += amount;
        _mint(to, amount);
        emit LPMinted(to, amount);
    }

    function mintDev(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        require(devMinted + amount <= DEV_ALLOCATION, "Dev allocation exceeded");
        devMinted += amount;
        _mint(to, amount);
        emit DevMinted(to, amount);
    }

    function toggleMinting() external onlyOwner {
        mintingEnabled = !mintingEnabled;
        emit MintingToggled(mintingEnabled);
    }

    function updatePuzzleSeed(bytes32 newSeed) external onlyOwner {
        require(newSeed != 0, "Seed cannot be zero");
        currentPuzzleSeed = newSeed;
        emit NewPuzzleSeed(newSeed);
    }

    function withdrawETH(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Zero address");
        (bool ok, ) = to.call{value: amount}("");
        require(ok, "ETH withdraw failed");
        emit ETHWithdrawn(to, amount);
    }

    function setMintCost(uint256 newCost) external onlyOwner {
        mintCost = newCost;
    }

    function setDifficulty(uint8 newDiff) external onlyOwner {
        require(newDiff >= MIN_DIFFICULTY && newDiff <= MAX_DIFFICULTY, "Invalid difficulty");
        uint8 old = currentDifficulty;
        currentDifficulty = newDiff;
        emit DifficultyAdjusted(old, newDiff, 0);
    }

    function setRandomDifficulty(uint256 chance, uint8 difficulty, uint256 bonus) external onlyOwner {
        require(chance <= 500, "Max 5%");
        require(difficulty >= MIN_DIFFICULTY && difficulty <= MAX_DIFFICULTY, "Invalid difficulty");
        require(bonus >= 100 && bonus <= 1000, "Bonus 1.00x-10.00x");
        randomChance = chance;
        randomDifficulty = difficulty;
        randomBonus = bonus;
    }

    // ═══════════════════════════════════════════════════════
    // Constructor
    // ═══════════════════════════════════════════════════════
    constructor(address initialOwner, bytes32 initialSeed) {
        require(initialOwner != address(0), "Zero owner");
        require(initialSeed != 0, "Zero seed");
        owner = initialOwner;
        currentPuzzleSeed = initialSeed;
        emit OwnershipTransferred(address(0), initialOwner);
    }
}
