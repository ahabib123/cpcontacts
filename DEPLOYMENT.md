# Freelancer Escrow Smart Contract - Deployment Guide

## Overview
This repository contains a Clarity smart contract for managing escrow payments between clients and freelancers on the Stacks blockchain. The contract supports secure fund holding, automated fee collection, and controlled fund release.

## Features
- **Secure Escrow**: Clients can create escrows that hold STX until work is completed
- **Automated Fees**: 5% platform fee automatically deducted and sent to treasury
- **Owner Control**: Contract owner can release funds or cancel escrows
- **Network Agnostic**: Works on Devnet, Testnet, and Mainnet without modification
- **Transparent**: All escrow data is publicly readable on-chain

## Contract Architecture

### Constants (Set at Deployment)
- `OWNER`: The principal that deployed the contract (has admin rights)
- `TREASURY`: Same as OWNER by default (receives platform fees)
- `FEE_PERCENTAGE`: 5% platform fee
- `FEE_DENOMINATOR`: 100 (for percentage calculation)

### Key Functions

#### Public Functions
1. **create-escrow** (freelancer: principal, amount: uint) → uint
   - Client calls this to create and fund an escrow
   - Transfers STX from client to contract
   - Returns unique escrow ID

2. **release-funds** (escrow-id: uint) → bool
   - Owner-only function to release payment to freelancer
   - Deducts 5% fee to treasury
   - Transfers 95% to freelancer

3. **cancel-escrow** (escrow-id: uint) → bool
   - Owner-only function to cancel and refund
   - Returns full amount to client

#### Read-Only Functions
- **get-escrow** (escrow-id: uint) → Escrow data
- **get-owner** () → principal
- **get-treasury** () → principal
- **calculate-fee** (amount: uint) → uint
- **calculate-freelancer-payment** (amount: uint) → uint

### Error Codes
- `u100`: ERR_UNAUTHORIZED - Caller is not authorized
- `u101`: ERR_ESCROW_NOT_FOUND - Escrow ID doesn't exist
- `u102`: ERR_INSUFFICIENT_FUNDS - Not enough STX
- `u103`: ERR_ALREADY_RELEASED - Escrow already released
- `u104`: ERR_ALREADY_CANCELLED - Escrow already cancelled
- `u105`: ERR_INVALID_AMOUNT - Amount must be greater than 0
- `u106`: ERR_TRANSFER_FAILED - STX transfer failed

## Prerequisites

### Required Tools
- [Clarinet](https://github.com/hirosystems/clarinet) - v1.0.0 or higher
- [Stacks CLI](https://docs.stacks.co/references/stacks-cli) (for mainnet/testnet deployment)
- Node.js and Deno (for running tests)

### Installation
```bash
# Install Clarinet
curl -L https://github.com/hirosystems/clarinet/releases/download/v1.0.0/clarinet-linux-x64.tar.gz | tar xz
sudo mv clarinet /usr/local/bin/

# Install Stacks CLI
npm install -g @stacks/cli

# Verify installations
clarinet --version
stx --version
```

## Local Development (Devnet)

### Setup
1. Clone the repository:
```bash
git clone <repository-url>
cd webmail
```

2. Check the project configuration:
```bash
clarinet check
```

### Running Tests
Execute the comprehensive test suite:
```bash
clarinet test
```

This will run all unit tests including:
- Escrow creation and validation
- Fund release with fee calculation
- Escrow cancellation and refunds
- Access control checks
- Edge case handling

### Interactive Console Testing
Start the Clarinet console for interactive testing:
```bash
clarinet console
```

Example console commands:
```clarity
;; Check contract owner
(contract-call? .escrow get-owner)

;; Create an escrow (as wallet_1 for wallet_2, 1 STX)
(as-contract (contract-call? .escrow create-escrow 'ST1J4G6RR643BCG8G8SR6M2D9Z9KXT2NJDRK3FBTK u1000000))

;; Get escrow details
(contract-call? .escrow get-escrow u1)

;; Calculate fee for 1 STX
(contract-call? .escrow calculate-fee u1000000)

;; Release funds (as deployer/owner)
(contract-call? .escrow release-funds u1)
```

## Testnet Deployment

### 1. Prepare Your Testnet Account
Get testnet STX from the faucet:
- Visit: https://explorer.stacks.co/sandbox/faucet?chain=testnet
- Or use the Hiro Wallet testnet faucet

### 2. Configure Deployment Settings
Edit `settings/Testnet.toml` and add your deployer address or use the Stacks CLI to manage keys:

```bash
# Generate a new account for testnet
stx make_keychain -t

# Save the mnemonic securely (not in the repo!)
# Note the address for deployment
```

### 3. Deploy to Testnet
Using Clarinet:
```bash
clarinet deploy --testnet
```

Or using Stacks CLI:
```bash
# First, broadcast the contract
stx deploy_contract escrow contracts/escrow.clar \
  --testnet \
  -k <your-private-key> \
  --fee 50000
```

### 4. Verify Deployment
Check your contract on the Stacks Explorer:
```
https://explorer.stacks.co/txid/<transaction-id>?chain=testnet
```

### Example Testnet Deployment
```
Contract Address: ST2EXAMPLE123...ABC.escrow
Transaction ID: 0xabcd1234...
Owner: ST2EXAMPLE123...ABC
Treasury: ST2EXAMPLE123...ABC
Network: Testnet
Block: 123456
```

## Mainnet Deployment

⚠️ **IMPORTANT SECURITY NOTES**:
- Never commit private keys or mnemonics to version control
- Use hardware wallets for mainnet deployments when possible
- Test thoroughly on testnet before mainnet deployment
- Ensure you have sufficient STX for deployment fees (~0.5 STX)

### 1. Prepare Mainnet Account
Ensure your mainnet account has:
- Sufficient STX for deployment (at least 1 STX recommended)
- Backup of your mnemonic/private key in a secure location

### 2. Configure Mainnet Settings
Edit `settings/Mainnet.toml` (DO NOT commit credentials):

```toml
[network]
name = "mainnet"
node_rpc_address = "https://api.hiro.so"

# Configure your account via environment variables or CLI
```

### 3. Deploy to Mainnet
```bash
# Using Clarinet (configure .env first)
clarinet deploy --mainnet

# Or using Stacks CLI
stx deploy_contract escrow contracts/escrow.clar \
  --mainnet \
  -k <your-private-key> \
  --fee 100000
```

### 4. Verify Mainnet Deployment
```
https://explorer.stacks.co/txid/<transaction-id>?chain=mainnet
```

### Example Mainnet Deployment
```
Contract Address: SP2EXAMPLE456...XYZ.escrow
Transaction ID: 0x1234abcd...
Owner: SP2EXAMPLE456...XYZ
Treasury: SP2EXAMPLE456...XYZ
Network: Mainnet
Block: 654321
```

## Network Configuration Summary

| Network | RPC Endpoint | Explorer | Faucet Available |
|---------|-------------|----------|------------------|
| Devnet | http://localhost:20443 | http://localhost:8000 | Yes (built-in) |
| Testnet | https://api.testnet.hiro.so | https://explorer.stacks.co/?chain=testnet | Yes |
| Mainnet | https://api.hiro.so | https://explorer.stacks.co | No |

## Usage Examples

### Creating an Escrow
```clarity
;; Client (wallet_1) creates escrow for freelancer (wallet_2)
;; Amount: 10 STX (10000000 micro-STX)
(contract-call? .escrow create-escrow 
  'ST2FREELANCER_ADDRESS 
  u10000000)
;; Returns: (ok u1) - Escrow ID 1
```

### Releasing Funds
```clarity
;; Owner releases funds for escrow #1
;; This sends 9.5 STX to freelancer and 0.5 STX to treasury
(contract-call? .escrow release-funds u1)
;; Returns: (ok true)
```

### Cancelling an Escrow
```clarity
;; Owner cancels escrow #1
;; Full 10 STX refunded to client
(contract-call? .escrow cancel-escrow u1)
;; Returns: (ok true)
```

### Checking Escrow Status
```clarity
;; Anyone can read escrow data
(contract-call? .escrow get-escrow u1)
;; Returns escrow details including status:
;; status u1 = ACTIVE
;; status u2 = RELEASED
;; status u3 = CANCELLED
```

## Integration Guide

### Frontend Integration
Use Stacks.js to interact with the contract:

```javascript
import { openContractCall } from '@stacks/connect';
import { uintCV, principalCV } from '@stacks/transactions';

// Create escrow
const createEscrow = async (freelancerAddress, amountMicroStx) => {
  await openContractCall({
    contractAddress: 'SP2...', // Your deployed contract address
    contractName: 'escrow',
    functionName: 'create-escrow',
    functionArgs: [
      principalCV(freelancerAddress),
      uintCV(amountMicroStx)
    ],
    network: 'mainnet', // or 'testnet'
  });
};

// Release funds (owner only)
const releaseFunds = async (escrowId) => {
  await openContractCall({
    contractAddress: 'SP2...',
    contractName: 'escrow',
    functionName: 'release-funds',
    functionArgs: [uintCV(escrowId)],
    network: 'mainnet',
  });
};
```

### Backend Integration
Use Stacks.js Node.js SDK:

```javascript
const { makeContractCall, broadcastTransaction } = require('@stacks/transactions');
const { StacksTestnet } = require('@stacks/network');

async function createEscrowBackend(privateKey, freelancerAddr, amount) {
  const network = new StacksTestnet();
  
  const txOptions = {
    contractAddress: 'ST2...',
    contractName: 'escrow',
    functionName: 'create-escrow',
    functionArgs: [principalCV(freelancerAddr), uintCV(amount)],
    senderKey: privateKey,
    network,
  };
  
  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);
  
  return broadcastResponse.txid;
}
```

## Monitoring and Maintenance

### Monitoring Escrows
Query escrow data programmatically:
```javascript
const { callReadOnlyFunction } = require('@stacks/transactions');

async function getEscrow(escrowId) {
  const result = await callReadOnlyFunction({
    contractAddress: 'SP2...',
    contractName: 'escrow',
    functionName: 'get-escrow',
    functionArgs: [uintCV(escrowId)],
    network: new StacksMainnet(),
    senderAddress: 'SP2...'
  });
  
  return result;
}
```

### Event Monitoring
Monitor STX transfers to track escrow activities using the Stacks blockchain API:
```bash
curl https://api.mainnet.hiro.so/extended/v1/address/SP2.../transactions
```

## Security Considerations

1. **Owner Privileges**: The deployer becomes the owner and has control over all escrows
2. **Fund Safety**: Funds are held by the contract itself (as-contract principal)
3. **No Upgrades**: Smart contracts on Stacks are immutable once deployed
4. **Testing**: Always test on testnet before mainnet deployment
5. **Fee Structure**: 5% fee is hardcoded and cannot be changed after deployment

## Troubleshooting

### Common Issues

**"Insufficient funds" error when creating escrow:**
- Ensure the client has enough STX in their wallet
- Remember: STX amounts are in micro-STX (1 STX = 1,000,000 micro-STX)

**"Unauthorized" error:**
- Only the contract owner can release or cancel escrows
- Verify you're calling from the correct address

**Deployment fails:**
- Check you have enough STX for deployment fees
- Verify network connectivity
- Ensure contract syntax is valid with `clarinet check`

**Tests failing:**
- Run `clarinet check` to validate contract syntax
- Ensure you have the latest version of Clarinet
- Check Deno is installed for TypeScript tests

## Project Structure
```
webmail/
├── contracts/
│   └── escrow.clar          # Main escrow smart contract
├── tests/
│   └── escrow_test.ts       # Comprehensive test suite
├── settings/
│   ├── Devnet.toml          # Local development configuration
│   ├── Testnet.toml         # Testnet deployment configuration
│   └── Mainnet.toml         # Mainnet deployment configuration
├── Clarinet.toml            # Clarinet project configuration
├── DEPLOYMENT.md            # This file
└── README.md                # Project overview
```

## Support and Resources

- [Clarity Documentation](https://docs.stacks.co/clarity/)
- [Clarinet Documentation](https://github.com/hirosystems/clarinet)
- [Stacks.js Documentation](https://stacks.js.org/)
- [Stacks Explorer](https://explorer.stacks.co/)
- [Stacks Discord](https://discord.gg/stacks)

## License
[Add your license here]

## Contributing
[Add contribution guidelines here]
