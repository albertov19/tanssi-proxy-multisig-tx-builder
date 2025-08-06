const { ApiPromise, WsProvider } = require("@polkadot/api");

export async function subProvider(network) {
  const chains = {
    tanssi: {
      ws: "wss://services.tanssi-mainnet.network/tanssi",
    }
  };

  // Instantiation of Polkadot API
  // Create WS Provider
  const wsProvider = new WsProvider(chains[network].ws);

  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
    noInitWarn: true,
  });
  await api.isReady;

  console.log(api.genesisHash.toHex());



  return api;
}