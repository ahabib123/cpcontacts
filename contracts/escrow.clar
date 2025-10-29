;; Freelancer Escrow Smart Contract
;; This contract enables secure escrow payments between clients and freelancers
;; with automated fee collection for the platform treasury

;; Constants - Set at deployment time
;; To deploy: clarinet console / clarinet deploy with proper initialization
;; OWNER: The contract administrator who can release funds
;; TREASURY: The platform address that receives fees
(define-constant OWNER tx-sender)
(define-constant TREASURY tx-sender)

;; Fee configuration (5% platform fee)
(define-constant FEE_PERCENTAGE u5)
(define-constant FEE_DENOMINATOR u100)

;; Error codes
(define-constant ERR_UNAUTHORIZED (err u100))
(define-constant ERR_ESCROW_NOT_FOUND (err u101))
(define-constant ERR_INSUFFICIENT_FUNDS (err u102))
(define-constant ERR_ALREADY_RELEASED (err u103))
(define-constant ERR_ALREADY_CANCELLED (err u104))
(define-constant ERR_INVALID_AMOUNT (err u105))
(define-constant ERR_TRANSFER_FAILED (err u106))

;; Escrow status enum
(define-constant STATUS_ACTIVE u1)
(define-constant STATUS_RELEASED u2)
(define-constant STATUS_CANCELLED u3)

;; Data structures
;; Escrow agreement data map
(define-map escrows
  { escrow-id: uint }
  {
    client: principal,
    freelancer: principal,
    amount: uint,
    status: uint,
    created-at: uint
  }
)

;; Counter for escrow IDs
(define-data-var escrow-nonce uint u0)

;; Read-only functions

(define-read-only (get-escrow (escrow-id uint))
  (map-get? escrows { escrow-id: escrow-id })
)

(define-read-only (get-owner)
  (ok OWNER)
)

(define-read-only (get-treasury)
  (ok TREASURY)
)

(define-read-only (calculate-fee (amount uint))
  (ok (/ (* amount FEE_PERCENTAGE) FEE_DENOMINATOR))
)

(define-read-only (calculate-freelancer-payment (amount uint))
  (let
    (
      (fee (/ (* amount FEE_PERCENTAGE) FEE_DENOMINATOR))
    )
    (ok (- amount fee))
  )
)

;; Public functions

;; Create a new escrow
;; Client calls this to create an escrow and fund it
;; The STX are transferred from the client to the contract
(define-public (create-escrow (freelancer principal) (amount uint))
  (let
    (
      (escrow-id (+ (var-get escrow-nonce) u1))
      (client tx-sender)
    )
    ;; Validation
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    
    ;; Transfer STX from client to contract
    (try! (stx-transfer? amount tx-sender (as-contract tx-sender)))
    
    ;; Store escrow data
    (map-set escrows
      { escrow-id: escrow-id }
      {
        client: client,
        freelancer: freelancer,
        amount: amount,
        status: STATUS_ACTIVE,
        created-at: block-height
      }
    )
    
    ;; Increment nonce
    (var-set escrow-nonce escrow-id)
    
    (ok escrow-id)
  )
)

;; Release funds to freelancer
;; Only the owner can release funds
;; Deducts platform fee and sends to treasury, rest goes to freelancer
(define-public (release-funds (escrow-id uint))
  (let
    (
      (escrow-data (unwrap! (map-get? escrows { escrow-id: escrow-id }) ERR_ESCROW_NOT_FOUND))
      (amount (get amount escrow-data))
      (freelancer (get freelancer escrow-data))
      (status (get status escrow-data))
      (fee (/ (* amount FEE_PERCENTAGE) FEE_DENOMINATOR))
      (freelancer-payment (- amount fee))
    )
    ;; Authorization check
    (asserts! (is-eq tx-sender OWNER) ERR_UNAUTHORIZED)
    
    ;; Status check
    (asserts! (is-eq status STATUS_ACTIVE) ERR_ALREADY_RELEASED)
    
    ;; Transfer fee to treasury
    (try! (as-contract (stx-transfer? fee tx-sender TREASURY)))
    
    ;; Transfer payment to freelancer
    (try! (as-contract (stx-transfer? freelancer-payment tx-sender freelancer)))
    
    ;; Update escrow status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow-data { status: STATUS_RELEASED })
    )
    
    (ok true)
  )
)

;; Cancel escrow and refund client
;; Only the owner can cancel an escrow
;; Full amount is returned to the client
(define-public (cancel-escrow (escrow-id uint))
  (let
    (
      (escrow-data (unwrap! (map-get? escrows { escrow-id: escrow-id }) ERR_ESCROW_NOT_FOUND))
      (amount (get amount escrow-data))
      (client (get client escrow-data))
      (status (get status escrow-data))
    )
    ;; Authorization check
    (asserts! (is-eq tx-sender OWNER) ERR_UNAUTHORIZED)
    
    ;; Status check
    (asserts! (is-eq status STATUS_ACTIVE) ERR_ALREADY_CANCELLED)
    
    ;; Refund full amount to client
    (try! (as-contract (stx-transfer? amount tx-sender client)))
    
    ;; Update escrow status
    (map-set escrows
      { escrow-id: escrow-id }
      (merge escrow-data { status: STATUS_CANCELLED })
    )
    
    (ok true)
  )
)
