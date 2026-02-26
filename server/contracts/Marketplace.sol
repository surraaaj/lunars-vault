// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Marketplace
 * @notice Decentralized AI Model Marketplace on Quai Network.
 *         AI developers list models secured by DataHaven hashes,
 *         users pay micro-transactions to rent access and prompt them.
 */
contract Marketplace {
    // ─── Structs ────────────────────────────────────────────────────────────────

    struct AIModel {
        string  dataHavenHash;    // Cryptographic pointer to model weights on DataHaven
        address creator;          // Developer who listed the model
        string  modelName;        // Human-readable model name
        uint256 pricePerPrompt;   // Cost in wei per access grant
    }

    // ─── State ───────────────────────────────────────────────────────────────────

    /// @notice Maps DataHaven hash → AIModel metadata
    mapping(string => AIModel) public models;

    /// @notice Tracks whether a user has paid for access to a specific model
    mapping(address => mapping(string => bool)) public hasAccess;

    /// @notice Ordered list of all DataHaven hashes (for enumeration)
    string[] public modelHashes;

    // ─── Events ──────────────────────────────────────────────────────────────────

    event ModelListed(
        string indexed dataHavenHash,
        address indexed creator,
        string  modelName,
        uint256 pricePerPrompt
    );

    event ModelRented(
        string  indexed dataHavenHash,
        address indexed renter,
        uint256 amountPaid
    );

    // ─── Functions ───────────────────────────────────────────────────────────────

    /**
     * @notice List an AI model on the marketplace.
     * @param _dataHavenHash  Unique DataHaven content hash for model weights.
     * @param _modelName      Human-readable name for the model.
     * @param _pricePerPrompt Access price in wei.
     */
    function listModel(
        string calldata _dataHavenHash,
        string calldata _modelName,
        uint256 _pricePerPrompt
    ) external {
        require(bytes(_dataHavenHash).length > 0, "Hash required");
        require(bytes(_modelName).length > 0,     "Name required");
        require(_pricePerPrompt > 0,              "Price must be > 0");
        require(
            models[_dataHavenHash].creator == address(0),
            "Model already listed"
        );

        models[_dataHavenHash] = AIModel({
            dataHavenHash:   _dataHavenHash,
            creator:         msg.sender,
            modelName:       _modelName,
            pricePerPrompt:  _pricePerPrompt
        });

        modelHashes.push(_dataHavenHash);

        emit ModelListed(_dataHavenHash, msg.sender, _modelName, _pricePerPrompt);
    }

    /**
     * @notice Pay to rent access to an AI model for this session.
     * @param _dataHavenHash DataHaven hash identifying the model.
     */
    function rentModel(string calldata _dataHavenHash) external payable {
        AIModel storage model = models[_dataHavenHash];
        require(model.creator != address(0),        "Model not found");
        require(msg.value >= model.pricePerPrompt,  "Insufficient payment");
        require(
            !hasAccess[msg.sender][_dataHavenHash],
            "Already has access"
        );

        // Grant access
        hasAccess[msg.sender][_dataHavenHash] = true;

        // Transfer funds to model creator
        (bool sent, ) = payable(model.creator).call{value: msg.value}("");
        require(sent, "Transfer failed");

        emit ModelRented(_dataHavenHash, msg.sender, msg.value);
    }

    /**
     * @notice Returns the full AIModel struct for a given hash.
     */
    function getModel(string calldata _dataHavenHash)
        external
        view
        returns (AIModel memory)
    {
        return models[_dataHavenHash];
    }

    /**
     * @notice Returns the total number of listed models.
     */
    function getModelCount() external view returns (uint256) {
        return modelHashes.length;
    }

    /**
     * @notice Returns the DataHaven hash at a given index.
     */
    function getModelHashAtIndex(uint256 _index)
        external
        view
        returns (string memory)
    {
        require(_index < modelHashes.length, "Index out of bounds");
        return modelHashes[_index];
    }
}
