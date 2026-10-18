---
sidebar_position: 1
title: Shared Wallets
description: Share wallet access with other users
last_update:
  date: 2026-10-18
verified_with: v1.6.2
---

# Shared Wallets

A wallet owner can share a wallet with other users on the same LNbits instance and choose what each of them may do. The invited user gets a **shared wallet** (type `lightning-shared`) in their own account. It points at the owner's wallet, so both see the same balance and payments; no funds are copied.

## Sharing a Wallet {#sharing-a-wallet}

1. Open the wallet.
2. Open **Share Wallet** in the wallet's settings panel.
3. Enter the other user's **username or email**. They must already have an account on this instance.
4. Select the permissions.
5. Send the invitation.

Only ordinary `lightning` wallets can be shared. A shared wallet cannot be shared again.

## Permissions {#permissions}

| Permission (API value) | Allows |
|------------|-------------|
| View payments (`view-payments`) | See the balance and payment history |
| Receive payments (`receive-payments`) | Create invoices |
| Send payments (`send-payments`) | Make payments from the owner's balance |

**Send payments** gives the invited user the power to spend the owner's funds. Grant it only to people you would hand the wallet's admin key to.

## Accepting an Invitation {#accepting-an-invitation}

1. The invitation appears in the invited user's account when they add a new wallet.
2. Choose the shared wallet type and accept the invitation, or reject it.
3. The shared wallet appears in your wallet list.

## Managing Shared Access {#managing-shared-access}

The owner can change the permissions of an existing share or revoke it from the same **Share Wallet** panel. Revoking removes the share, removes any pending invitation, and deletes the invited user's shared copy of the wallet.

## API {#api}

Wallet-key routes take the source wallet's **admin key** in the `X-Api-Key` header. Account routes use the logged-in user (bearer token or cookie).

| Action | Request | Auth |
|--------|---------|------|
| Invite | `PUT /api/v1/wallet/share/invite` with `{"username": "...", "permissions": ["view-payments"], "status": "invite_sent"}` | owner's admin key |
| Change permissions | `PUT /api/v1/wallet/share` with the share's `shared_with_wallet_id` and new `permissions` | owner's admin key |
| Revoke | `DELETE /api/v1/wallet/share/{request_id}` | owner's admin key |
| Accept | `POST /api/v1/wallet` with `{"wallet_type": "lightning-shared", "shared_wallet_id": "<owner's wallet ID>"}` | invited user |
| Reject | `DELETE /api/v1/wallet/share/invite/{request_id}` | invited user |

A share's status is `invite_sent` until it is accepted, then `approved`.

## Use Cases {#use-cases}

- **Team accounts**: several people managing one balance
- **Family wallets**: shared household spending
- **Business**: staff who can create invoices but not spend (`receive-payments` only)

## Security {#security}

- Share only with users you trust, and grant the fewest permissions that work.
- Review shares regularly and revoke the ones you no longer need.
- Sharing does not hand out the wallet's keys. To revoke access for someone who has a key, create a new wallet and move the funds.

## See Also

- [Wallets Architecture](/docs/architecture/wallets)
- [Security](/docs/configuration/security)
