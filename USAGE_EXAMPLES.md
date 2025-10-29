# Freelancer Escrow Contract - Usage Examples

This document provides practical examples of how to interact with the escrow smart contract.

## Console Testing (Local Devnet)

Start the Clarinet console for interactive testing:

```bash
clarinet console
```

### Example 1: Create an Escrow

```clarity
;; Wallet 1 (client) creates an escrow for Wallet 2 (freelancer)
;; Escrow amount: 10 STX (10,000,000 micro-STX)

;; As wallet_1 (client)
(contract-call? .escrow create-escrow 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG u10000000)
;; Expected output: (ok u1)  <- Escrow ID 1 created
```

### Example 2: Check Escrow Details

```clarity
;; Anyone can read escrow details
(contract-call? .escrow get-escrow u1)

;; Expected output:
;; (some {
;;   client: ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5,
;;   freelancer: ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG,
;;   amount: u10000000,
;;   status: u1,  ;; STATUS_ACTIVE
;;   created-at: u2
;; })
```

### Example 3: Calculate Fees

```clarity
;; Check how much fee will be deducted
(contract-call? .escrow calculate-fee u10000000)
;; Expected output: (ok u500000)  <- 0.5 STX fee (5%)

;; Check how much freelancer will receive
(contract-call? .escrow calculate-freelancer-payment u10000000)
;; Expected output: (ok u9500000)  <- 9.5 STX payment (95%)
```

### Example 4: Release Funds (Success Flow)

```clarity
;; As deployer (owner) - release funds to freelancer
(contract-call? .escrow release-funds u1)
;; Expected output: (ok true)

;; Verify the escrow status changed
(contract-call? .escrow get-escrow u1)
;; Status should now be u2 (STATUS_RELEASED)

;; Freelancer received: 9.5 STX
;; Treasury received: 0.5 STX
```

### Example 5: Cancel Escrow (Refund Flow)

```clarity
;; Create another escrow first
(contract-call? .escrow create-escrow 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG u5000000)
;; Expected output: (ok u2)

;; As deployer (owner) - cancel and refund
(contract-call? .escrow cancel-escrow u2)
;; Expected output: (ok true)

;; Verify the escrow status changed
(contract-call? .escrow get-escrow u2)
;; Status should now be u3 (STATUS_CANCELLED)

;; Client received full refund: 5 STX
```

### Example 6: Error Cases

```clarity
;; Try to create escrow with zero amount
(contract-call? .escrow create-escrow 'ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG u0)
;; Expected output: (err u105)  <- ERR_INVALID_AMOUNT

;; Try to release non-existent escrow
(contract-call? .escrow release-funds u999)
;; Expected output: (err u101)  <- ERR_ESCROW_NOT_FOUND

;; Try to release as non-owner (from wallet_2)
::set_tx_sender ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG
(contract-call? .escrow release-funds u1)
;; Expected output: (err u100)  <- ERR_UNAUTHORIZED
```

## Frontend Integration with Stacks.js

### Setup

```bash
npm install @stacks/connect @stacks/transactions @stacks/network
```

### Example: Create Escrow from Web App

```javascript
import { openContractCall } from '@stacks/connect';
import { uintCV, principalCV, PostConditionMode } from '@stacks/transactions';
import { StacksTestnet, StacksMainnet } from '@stacks/network';

// Configuration
const CONTRACT_ADDRESS = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM'; // Replace with your deployed address
const CONTRACT_NAME = 'escrow';
const network = new StacksTestnet(); // or new StacksMainnet()

// Function to create escrow
async function createEscrow(freelancerAddress, amountSTX) {
  const amountMicroSTX = amountSTX * 1000000; // Convert STX to micro-STX
  
  const functionArgs = [
    principalCV(freelancerAddress),
    uintCV(amountMicroSTX)
  ];

  const options = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'create-escrow',
    functionArgs,
    network,
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Transaction successful:', data.txId);
      console.log('Escrow created! Check transaction:', 
        `https://explorer.stacks.co/txid/${data.txId}?chain=testnet`);
    },
    onCancel: () => {
      console.log('Transaction cancelled');
    }
  };

  await openContractCall(options);
}

// Usage
createEscrow('ST2FREELANCER_ADDRESS_HERE', 10); // Create 10 STX escrow
```

### Example: Release Funds (Owner Only)

```javascript
async function releaseFunds(escrowId) {
  const functionArgs = [uintCV(escrowId)];

  const options = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'release-funds',
    functionArgs,
    network,
    postConditionMode: PostConditionMode.Deny,
    onFinish: (data) => {
      console.log('Funds released successfully:', data.txId);
    }
  };

  await openContractCall(options);
}

// Usage
releaseFunds(1); // Release funds for escrow ID 1
```

### Example: Read Escrow Data

```javascript
import { callReadOnlyFunction, cvToJSON } from '@stacks/transactions';

async function getEscrowDetails(escrowId) {
  const result = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'get-escrow',
    functionArgs: [uintCV(escrowId)],
    network,
    senderAddress: CONTRACT_ADDRESS
  });

  const escrowData = cvToJSON(result);
  console.log('Escrow Details:', escrowData);
  return escrowData;
}

// Usage
getEscrowDetails(1);
```

### Example: Calculate Fees

```javascript
async function calculateFees(amountSTX) {
  const amountMicroSTX = amountSTX * 1000000;
  
  const feeResult = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'calculate-fee',
    functionArgs: [uintCV(amountMicroSTX)],
    network,
    senderAddress: CONTRACT_ADDRESS
  });

  const paymentResult = await callReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'calculate-freelancer-payment',
    functionArgs: [uintCV(amountMicroSTX)],
    network,
    senderAddress: CONTRACT_ADDRESS
  });

  const fee = cvToJSON(feeResult).value.value / 1000000;
  const payment = cvToJSON(paymentResult).value.value / 1000000;

  console.log(`For ${amountSTX} STX escrow:`);
  console.log(`- Platform fee: ${fee} STX (5%)`);
  console.log(`- Freelancer receives: ${payment} STX (95%)`);

  return { fee, payment };
}

// Usage
calculateFees(10); // Calculate fees for 10 STX
```

## Backend Integration with Node.js

### Example: Create Escrow from Backend

```javascript
import { makeContractCall, broadcastTransaction, AnchorMode } from '@stacks/transactions';
import { StacksTestnet } from '@stacks/network';

const network = new StacksTestnet();
const privateKey = process.env.PRIVATE_KEY; // Load from secure environment variable

async function createEscrowBackend(freelancerAddr, amountSTX) {
  const amountMicroSTX = BigInt(amountSTX * 1000000);

  const txOptions = {
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: 'create-escrow',
    functionArgs: [
      principalCV(freelancerAddr),
      uintCV(amountMicroSTX)
    ],
    senderKey: privateKey,
    network,
    anchorMode: AnchorMode.Any,
  };

  const transaction = await makeContractCall(txOptions);
  const broadcastResponse = await broadcastTransaction(transaction, network);

  if (broadcastResponse.error) {
    console.error('Error:', broadcastResponse);
    throw new Error(broadcastResponse.reason);
  }

  console.log('Transaction ID:', broadcastResponse.txid);
  return broadcastResponse.txid;
}
```

## Complete Workflow Example

### Scenario: Hire a Freelancer for a Project

```javascript
// 1. Client creates escrow for 50 STX
await createEscrow('ST2FREELANCER123...', 50);
// Transaction confirmed, escrow ID = 1

// 2. Freelancer completes work (off-chain)

// 3. Client/Platform admin verifies work and releases funds
await releaseFunds(1);
// Freelancer receives 47.5 STX (95%)
// Treasury receives 2.5 STX (5%)

// 4. Verify final status
const escrow = await getEscrowDetails(1);
console.log('Status:', escrow.value.status); // Should be 2 (RELEASED)
```

### Scenario: Cancel and Refund

```javascript
// 1. Client creates escrow for 20 STX
await createEscrow('ST2FREELANCER456...', 20);
// Escrow ID = 2

// 2. Project is cancelled before completion

// 3. Admin cancels escrow and refunds client
await cancelEscrow(2);
// Client receives full 20 STX refund

// 4. Verify final status
const escrow = await getEscrowDetails(2);
console.log('Status:', escrow.value.status); // Should be 3 (CANCELLED)
```

## Error Handling

```javascript
try {
  await createEscrow('ST2FREELANCER...', 0);
} catch (error) {
  // Handle ERR_INVALID_AMOUNT (u105)
  console.error('Invalid amount: Must be greater than 0');
}

try {
  await releaseFunds(999);
} catch (error) {
  // Handle ERR_ESCROW_NOT_FOUND (u101)
  console.error('Escrow not found');
}
```

## Monitoring Events

Monitor escrow activities using the Stacks API:

```javascript
async function monitorEscrowActivity(contractAddress) {
  const url = `https://api.testnet.hiro.so/extended/v1/address/${contractAddress}/transactions`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  data.results.forEach(tx => {
    if (tx.tx_type === 'contract_call') {
      console.log('Transaction:', tx.tx_id);
      console.log('Function:', tx.contract_call.function_name);
      console.log('Status:', tx.tx_status);
    }
  });
}
```

## Best Practices

1. **Always validate input**: Check amounts and addresses before creating escrows
2. **Use post-conditions**: Add STX transfer post-conditions for extra security
3. **Monitor transaction status**: Wait for confirmations before updating UI
4. **Handle errors gracefully**: Display user-friendly error messages
5. **Test on testnet first**: Thoroughly test all flows before mainnet deployment
6. **Secure private keys**: Never expose private keys in client-side code
7. **Use environment variables**: Store sensitive data securely

## Additional Resources

- [Stacks.js Documentation](https://stacks.js.org/)
- [Clarity Language Reference](https://docs.stacks.co/clarity/)
- [Stacks Explorer](https://explorer.stacks.co/)
- [Contract Deployment Guide](./DEPLOYMENT.md)
