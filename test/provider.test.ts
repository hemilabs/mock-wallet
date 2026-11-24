import { createWalletClient, http, type LocalAccount } from "viem";
import { hemi, mainnet } from "viem/chains";
import { describe, expect, it, vi } from "vitest";

import { createMockWalletProvider } from "../src/provider";

vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof import("viem")>()),
  createWalletClient: vi.fn(),
}));

const address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const otherAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

// @ts-expect-error - We only create a minimal account for testing purposes
const account: LocalAccount = { address };

const transport = http("http://127.0.0.1:8545");

const createClient = function () {
  const client = {
    getAddresses: vi.fn().mockResolvedValue([address]),
    request: vi.fn().mockResolvedValue("0x1"),
    sendTransaction: vi.fn().mockResolvedValue("0xhash"),
    signMessage: vi.fn().mockResolvedValue("0xsignature"),
  };
  // @ts-expect-error - We only create a minimal client for testing purposes
  vi.mocked(createWalletClient).mockReturnValue(client);
  return client;
};

const createProvider = () =>
  createMockWalletProvider({
    account,
    chain: mainnet,
    transports: { [mainnet.id]: transport },
  });

describe("createMockWalletProvider", function () {
  it("should throw an error if the chain has no transport", function () {
    expect(() =>
      createMockWalletProvider({
        account,
        chain: hemi,
        transports: { [mainnet.id]: transport },
      }),
    ).toThrow(`No transport configured for chain ${hemi.id}`);
  });

  it("should create the wallet client with the chain's transport", function () {
    createClient();
    createProvider();

    expect(createWalletClient).toHaveBeenCalledWith({
      account,
      chain: mainnet,
      transport,
    });
  });

  it.each([
    ["wallet_getPermissions", []],
    ["wallet_requestPermissions", [{ parentCapability: "eth_accounts" }]],
    ["wallet_revokePermissions", [{ parentCapability: "eth_accounts" }]],
    ["wallet_switchEthereumChain", null],
  ])(
    "should answer %s without reaching the client",
    async function (method, expected) {
      const client = createClient();

      await expect(createProvider().request({ method })).resolves.toEqual(
        expected,
      );
      expect(client.request).not.toHaveBeenCalled();
    },
  );

  it.each(["eth_accounts", "eth_requestAccounts"])(
    "should return the account on %s",
    async function (method) {
      createClient();

      await expect(createProvider().request({ method })).resolves.toEqual([
        address,
      ]);
    },
  );

  it("should sign the raw message on personal_sign", async function () {
    const client = createClient();

    await expect(
      createProvider().request({
        method: "personal_sign",
        params: ["0x68656c6c6f", address],
      }),
    ).resolves.toBe("0xsignature");
    expect(client.signMessage).toHaveBeenCalledWith({
      message: { raw: "0x68656c6c6f" },
    });
  });

  it("should reject a transaction from another address", async function () {
    const client = createClient();

    await expect(
      createProvider().request({
        method: "eth_sendTransaction",
        params: [{ from: otherAddress, to: otherAddress }],
      }),
    ).rejects.toThrow("Invalid from address");
    expect(client.sendTransaction).not.toHaveBeenCalled();
  });

  it("should send the transaction with its value as a bigint", async function () {
    const client = createClient();

    await expect(
      createProvider().request({
        method: "eth_sendTransaction",
        params: [
          {
            data: "0xabcdef",
            from: address.toLowerCase(),
            to: otherAddress,
            value: "0x10",
          },
        ],
      }),
    ).resolves.toBe("0xhash");
    expect(client.sendTransaction).toHaveBeenCalledWith({
      data: "0xabcdef",
      to: otherAddress,
      value: BigInt(16),
    });
  });

  it("should send a transaction without value", async function () {
    const client = createClient();

    await createProvider().request({
      method: "eth_sendTransaction",
      params: [{ from: address, to: otherAddress }],
    });
    expect(client.sendTransaction).toHaveBeenCalledWith({
      data: undefined,
      to: otherAddress,
      value: undefined,
    });
  });

  it("should forward any other method to the client", async function () {
    const client = createClient();

    await expect(
      createProvider().request({ method: "eth_chainId", params: [] }),
    ).resolves.toBe("0x1");
    expect(client.request).toHaveBeenCalledWith({
      method: "eth_chainId",
      params: [],
    });
  });
});
