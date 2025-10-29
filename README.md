# Freelancer Escrow Smart Contract

A secure, network-agnostic Clarity smart contract for managing escrow payments between clients and freelancers on the Stacks blockchain.

## Features

- ✅ **Secure Escrow Management**: Safely hold STX until work is completed
- ✅ **Automated Fee Collection**: 5% platform fee automatically deducted
- ✅ **Multi-Network Support**: Deploy on Devnet, Testnet, or Mainnet without modification
- ✅ **Owner Control**: Admin can release payments or cancel escrows
- ✅ **Transparent**: All escrow data is publicly readable on-chain
- ✅ **Comprehensive Tests**: Full test suite included

## Quick Start

### Prerequisites
- [Clarinet](https://github.com/hirosystems/clarinet) v1.0.0+
- [Deno](https://deno.land/) (for tests)

### Installation
```bash
git clone <repository-url>
cd webmail
clarinet check
```

### Run Tests
```bash
clarinet test
```

### Deploy Locally
```bash
clarinet console
```

## Contract Overview

### Key Functions

**Public Functions:**
- `create-escrow` - Client creates and funds an escrow
- `release-funds` - Owner releases payment to freelancer (with 5% fee)
- `cancel-escrow` - Owner cancels and refunds client

**Read-Only Functions:**
- `get-escrow` - Get escrow details
- `calculate-fee` - Calculate platform fee
- `calculate-freelancer-payment` - Calculate freelancer payment after fee

### Fee Structure
- Platform fee: **5%** of escrow amount
- Freelancer receives: **95%** of escrow amount
- Fee sent to treasury address (deployer by default)

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed deployment instructions for:
- Local development (Devnet)
- Testnet deployment
- Mainnet deployment

## Usage Example

```clarity
;; Create an escrow for 10 STX
(contract-call? .escrow create-escrow 'ST2FREELANCER_ADDRESS u10000000)
;; Returns: (ok u1) - Escrow ID

;; Release funds (owner only)
(contract-call? .escrow release-funds u1)
;; Sends 9.5 STX to freelancer, 0.5 STX to treasury

;; Or cancel and refund
(contract-call? .escrow cancel-escrow u1)
;; Returns 10 STX to client
```

## Project Structure

```
webmail/
├── contracts/
│   └── escrow.clar          # Escrow smart contract
├── tests/
│   └── escrow_test.ts       # Test suite
├── settings/
│   ├── Devnet.toml          # Local dev config
│   ├── Testnet.toml         # Testnet config
│   └── Mainnet.toml         # Mainnet config
├── Clarinet.toml            # Project config
└── DEPLOYMENT.md            # Deployment guide
```

## Security

- Contract owner has admin privileges
- Funds held securely by contract
- Immutable once deployed
- Thoroughly tested

## Documentation

- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment instructions
- [Clarity Docs](https://docs.stacks.co/clarity/) - Clarity language reference
- [Stacks Docs](https://docs.stacks.co/) - Stacks blockchain documentation

## License

[Add your license here]