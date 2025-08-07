const { ApiPromise, WsProvider } = require("@polkadot/api");

export async function subProvider(ws) {


  // Instantiation of Polkadot API
  // Create WS Provider
  const wsProvider = new WsProvider(ws);

  // Wait for Provider
  const api = await ApiPromise.create({
    provider: wsProvider,
    noInitWarn: true,
  });
  await api.isReady;

  console.log(api.genesisHash.toHex());



  return api;
}