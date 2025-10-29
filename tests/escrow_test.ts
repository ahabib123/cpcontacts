import { describe, expect, it } from "vitest";
import { Cl } from "@stacks/transactions";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!;

/**
 * Test suite for the Escrow Smart Contract
 * 
 * This suite tests all major functions of the escrow contract:
 * - Creating escrows
 * - Releasing funds to freelancers
 * - Cancelling escrows and refunding clients
 * - Fee calculations
 * - Access control
 */

describe("Escrow Contract Tests", () => {
  it("ensures that owner and treasury are set correctly at deployment", () => {
    const ownerResult = simnet.callReadOnlyFn(
      "escrow",
      "get-owner",
      [],
      deployer
    );
    expect(ownerResult.result).toBeOk(Cl.principal(deployer));

    const treasuryResult = simnet.callReadOnlyFn(
      "escrow",
      "get-treasury",
      [],
      deployer
    );
    expect(treasuryResult.result).toBeOk(Cl.principal(deployer));
  });

  it("can create an escrow with valid parameters", () => {
    const escrowAmount = 1000000; // 1 STX

    const { result } = simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(escrowAmount)],
      wallet1
    );
    expect(result).toBeOk(Cl.uint(1));

    // Verify escrow was created
    const escrowData = simnet.callReadOnlyFn(
      "escrow",
      "get-escrow",
      [Cl.uint(1)],
      deployer
    );
    
    expect(escrowData.result).toBeSome(
      Cl.tuple({
        client: Cl.principal(wallet1),
        freelancer: Cl.principal(wallet2),
        amount: Cl.uint(escrowAmount),
        status: Cl.uint(1), // STATUS_ACTIVE
        "created-at": Cl.uint(simnet.blockHeight),
      })
    );
  });

  it("cannot create escrow with zero amount", () => {
    const { result } = simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(0)],
      wallet1
    );
    expect(result).toBeErr(Cl.uint(105)); // ERR_INVALID_AMOUNT
  });

  it("multiple escrows can be created and get unique IDs", () => {
    const result1 = simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(1000000)],
      wallet1
    );
    expect(result1.result).toBeOk(Cl.uint(1));

    const result2 = simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet3), Cl.uint(2000000)],
      wallet1
    );
    expect(result2.result).toBeOk(Cl.uint(2));

    const result3 = simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(3000000)],
      wallet3
    );
    expect(result3.result).toBeOk(Cl.uint(3));
  });

  it("owner can release funds and fee is correctly calculated", () => {
    const escrowAmount = 1000000; // 1 STX
    const expectedFee = 50000; // 5% of 1 STX
    const expectedFreelancerPayment = 950000; // 95% of 1 STX

    // Create escrow
    const createResult = simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(escrowAmount)],
      wallet1
    );
    expect(createResult.result).toBeOk(Cl.uint(1));

    // Get balances before release
    const freelancerBalanceBefore = simnet.getAssetsMap().get("STX")?.get(wallet2) || 0;
    const treasuryBalanceBefore = simnet.getAssetsMap().get("STX")?.get(deployer) || 0;

    // Release funds
    const releaseResult = simnet.callPublicFn(
      "escrow",
      "release-funds",
      [Cl.uint(1)],
      deployer
    );
    expect(releaseResult.result).toBeOk(Cl.bool(true));

    // Verify balances changed correctly
    const freelancerBalanceAfter = simnet.getAssetsMap().get("STX")?.get(wallet2) || 0;
    const treasuryBalanceAfter = simnet.getAssetsMap().get("STX")?.get(deployer) || 0;

    expect(Number(freelancerBalanceAfter) - Number(freelancerBalanceBefore)).toBe(expectedFreelancerPayment);
    expect(Number(treasuryBalanceAfter) - Number(treasuryBalanceBefore)).toBe(expectedFee);

    // Verify escrow status is updated
    const escrowData = simnet.callReadOnlyFn(
      "escrow",
      "get-escrow",
      [Cl.uint(1)],
      deployer
    );
    
    const escrowTuple = escrowData.result.value as any;
    expect(escrowTuple.data.status).toEqual(Cl.uint(2)); // STATUS_RELEASED
  });

  it("only owner can release funds", () => {
    // Create escrow
    simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(1000000)],
      wallet1
    );

    // Try to release as unauthorized user
    const { result } = simnet.callPublicFn(
      "escrow",
      "release-funds",
      [Cl.uint(1)],
      wallet3
    );
    expect(result).toBeErr(Cl.uint(100)); // ERR_UNAUTHORIZED
  });

  it("cannot release funds twice", () => {
    // Create escrow
    simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(1000000)],
      wallet1
    );

    // Release once
    const firstRelease = simnet.callPublicFn(
      "escrow",
      "release-funds",
      [Cl.uint(1)],
      deployer
    );
    expect(firstRelease.result).toBeOk(Cl.bool(true));

    // Try to release again
    const secondRelease = simnet.callPublicFn(
      "escrow",
      "release-funds",
      [Cl.uint(1)],
      deployer
    );
    expect(secondRelease.result).toBeErr(Cl.uint(103)); // ERR_ALREADY_RELEASED
  });

  it("owner can cancel escrow and refund client", () => {
    const escrowAmount = 1000000;

    // Create escrow
    simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(escrowAmount)],
      wallet1
    );

    // Get client balance before cancel
    const clientBalanceBefore = simnet.getAssetsMap().get("STX")?.get(wallet1) || 0;

    // Cancel escrow
    const cancelResult = simnet.callPublicFn(
      "escrow",
      "cancel-escrow",
      [Cl.uint(1)],
      deployer
    );
    expect(cancelResult.result).toBeOk(Cl.bool(true));

    // Verify client got full refund
    const clientBalanceAfter = simnet.getAssetsMap().get("STX")?.get(wallet1) || 0;
    expect(Number(clientBalanceAfter) - Number(clientBalanceBefore)).toBe(escrowAmount);

    // Verify escrow status is updated
    const escrowData = simnet.callReadOnlyFn(
      "escrow",
      "get-escrow",
      [Cl.uint(1)],
      deployer
    );
    
    const escrowTuple = escrowData.result.value as any;
    expect(escrowTuple.data.status).toEqual(Cl.uint(3)); // STATUS_CANCELLED
  });

  it("only owner can cancel escrow", () => {
    // Create escrow
    simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(1000000)],
      wallet1
    );

    // Try to cancel as unauthorized user
    const { result } = simnet.callPublicFn(
      "escrow",
      "cancel-escrow",
      [Cl.uint(1)],
      wallet3
    );
    expect(result).toBeErr(Cl.uint(100)); // ERR_UNAUTHORIZED
  });

  it("cannot cancel already released escrow", () => {
    // Create escrow
    simnet.callPublicFn(
      "escrow",
      "create-escrow",
      [Cl.principal(wallet2), Cl.uint(1000000)],
      wallet1
    );

    // Release first
    simnet.callPublicFn(
      "escrow",
      "release-funds",
      [Cl.uint(1)],
      deployer
    );

    // Try to cancel
    const { result } = simnet.callPublicFn(
      "escrow",
      "cancel-escrow",
      [Cl.uint(1)],
      deployer
    );
    expect(result).toBeErr(Cl.uint(104)); // ERR_ALREADY_CANCELLED
  });

  it("fee calculation functions work correctly", () => {
    const feeFor1STX = simnet.callReadOnlyFn(
      "escrow",
      "calculate-fee",
      [Cl.uint(1000000)],
      deployer
    );
    expect(feeFor1STX.result).toBeOk(Cl.uint(50000));

    const paymentFor1STX = simnet.callReadOnlyFn(
      "escrow",
      "calculate-freelancer-payment",
      [Cl.uint(1000000)],
      deployer
    );
    expect(paymentFor1STX.result).toBeOk(Cl.uint(950000));

    const feeFor5STX = simnet.callReadOnlyFn(
      "escrow",
      "calculate-fee",
      [Cl.uint(5000000)],
      deployer
    );
    expect(feeFor5STX.result).toBeOk(Cl.uint(250000));

    const paymentFor5STX = simnet.callReadOnlyFn(
      "escrow",
      "calculate-freelancer-payment",
      [Cl.uint(5000000)],
      deployer
    );
    expect(paymentFor5STX.result).toBeOk(Cl.uint(4750000));
  });

  it("cannot release or cancel non-existent escrow", () => {
    const releaseResult = simnet.callPublicFn(
      "escrow",
      "release-funds",
      [Cl.uint(999)],
      deployer
    );
    expect(releaseResult.result).toBeErr(Cl.uint(101)); // ERR_ESCROW_NOT_FOUND

    const cancelResult = simnet.callPublicFn(
      "escrow",
      "cancel-escrow",
      [Cl.uint(999)],
      deployer
    );
    expect(cancelResult.result).toBeErr(Cl.uint(101)); // ERR_ESCROW_NOT_FOUND
  });
});

