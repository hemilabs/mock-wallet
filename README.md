# @hemilabs/mock-wallet

EIP-6963 mock wallet for end-to-end tests

[![NPM version](https://img.shields.io/npm/v/@hemilabs/mock-wallet)](https://www.npmjs.com/package/@hemilabs/mock-wallet) [![Package size](https://img.shields.io/bundlephobia/minzip/@hemilabs/mock-wallet)](https://bundlephobia.com/package/@hemilabs/mock-wallet) [![Follow Hemi on X](https://img.shields.io/twitter/url?url=https%3A%2F%2Fx.com%2Fhemi_xyz&style=flat&logo=x&label=%40hemi_xyz&labelColor=%23ff6c15&color=%230a0a0a)](https://x.com/intent/follow?screen_name=hemi_xyz)

## Installation

Install `@hemilabs/mock-wallet` with its peer dependencies as dev dependencies:

```sh
npm install --save-dev @hemilabs/mock-wallet @playwright/test viem
```

## Usage

The wallet announces itself to the page through [EIP-6963](https://eips.ethereum.org/EIPS/eip-6963), so wallet-discovery libraries such as wagmi and RainbowKit pick it up with no browser extension. It approves accounts, signs and sends transactions on its own, with no popup and no clicks.

The signing runs in Node: the page only forwards each request through a Playwright binding to a viem wallet client. Point its transport at a local fork such as [Anvil](https://book.getfoundry.sh/reference/anvil/), never at a real network, since every request is approved automatically.

```ts
import { TEST_PRIVATE_KEY } from "@hemilabs/anvil-fork-setup/utils";
import { installMockWallet } from "@hemilabs/mock-wallet";
import { test as base } from "@playwright/test";
import { http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { hemi } from "viem/chains";

export const test = base.extend({
  async page({ page }, use) {
    await installMockWallet({
      account: privateKeyToAccount(TEST_PRIVATE_KEY),
      chain: hemi,
      page,
      transports: { [hemi.id]: http("http://127.0.0.1:8545") },
    });
    await use(page);
  },
});
```

## Methods

### `installMockWallet`

Injects the wallet into a Playwright page before the app scripts run.

```ts
installMockWallet({ account, chain, page, transports });
```

- **account**: `LocalAccount` — from viem, the account that signs every request (required)
- **chain**: `Chain` — from viem, the chain the wallet is on (required)
- **page**: `Page` — from Playwright, the page to inject the wallet into (required)
- **transports**: `Record<number, Transport>` — from viem, keyed by chain id. The one for `chain` is required, and there is no fallback to a public RPC (required)

### `createMockWalletProvider`

Returns the EIP-1193 request handler behind the wallet, for hosts other than Playwright.

```ts
createMockWalletProvider({ account, chain, transports });
```

It takes the same parameters as `installMockWallet`, without `page`. It answers the account and permission requests itself, signs messages, sends transactions from `account` only, and passes every other method to the transport. `wallet_switchEthereumChain` is accepted but does not move the wallet.

### `announceEip6963Provider`

Announces an EIP-1193 provider to the page through EIP-6963. It touches `window`, so it runs in the browser, not in Node.

```ts
announceEip6963Provider({ info, provider });
```

- **info**: `Eip6963ProviderInfo` — the name, icon and rdns the wallet announces (required)
- **provider**: `Eip6963Provider` — the EIP-1193 provider to announce (required)

`MOCK_WALLET_INFO` holds the info `installMockWallet` announces.
