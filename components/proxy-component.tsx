import React, { useState, useEffect } from "react";
import { Container, Input, Form, TextArea, Header, Loader } from "semantic-ui-react";
import { subProvider } from "../web3/polkadotAPI";

const ProxyComponent = ({ network }) => {
  const [proxyAccount, setProxyAccount] = useState("");
  const [destAccount, setDestAccount] = useState("");
  const [amount, setAmount] = useState("");
  const [calldata, setCalldata] = useState("");
  const [err, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const chains = {
    tanssi: {
      ws: "wss://services.tanssi-mainnet.network/tanssi",
      token: "TANSSI"
    },
    // ...add more networks if needed
  };

  // Effect runs when *all three* fields have values
  useEffect(() => {
    if (proxyAccount && destAccount && amount) {
      constructCall();
    }
    // eslint-disable-next-line
  }, [proxyAccount, destAccount, amount]);

  const constructCall = async () => {
    setErrorMessage("");
    setLoading(true);
    setCalldata(""); // clear previous calldata while loading

    try {
      const api = (await subProvider(chains[network].ws)) as any;

      // Transform Decimals
      const decimals = api.registry.chainDecimals[0];
      const amountInUnits = BigInt(amount) * BigInt(10 ** decimals);

      // Proxy Calldata
      const tx = await api.tx.proxy.proxy(
        proxyAccount,
        null,
        await api.tx.balances.transferKeepAlive(destAccount, amountInUnits)
      );

      setCalldata(tx.method.toHex());
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: 500, marginTop: 30 }}>
      <Form>
        <Form.Field>
          <label>Proxy Account</label>
          <Input
            placeholder="Enter Proxy Account..."
            value={proxyAccount}
            onChange={(e) => setProxyAccount(e.target.value)}
          />
        </Form.Field>
        <Form.Field>
          <label>Destination Account</label>
          <Input
            placeholder="Enter Destination Account..."
            value={destAccount}
            onChange={(e) => setDestAccount(e.target.value)}
          />
        </Form.Field>
        <Form.Field>
          <label>Amount</label>
          <Input
            placeholder="Enter Amount..."
            value={amount}
            label={chains[network]?.token}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Form.Field>
      </Form>
      <Header as="h4" style={{ marginTop: 30 }}>
        Calldata
      </Header>
      <div style={{ position: "relative" }}>
        <TextArea
          value={calldata}
          placeholder="Calldata will be shown here once all fields are filled up..."
          style={{ width: "100%", minHeight: 60, opacity: loading ? 0.5 : 1 }}
          readOnly
        />
        {loading && (
          <Loader
            active
            inline="centered"
            size="small"
            style={{
              position: "absolute",
              top: 10,
              left: 0,
              right: 0,
              margin: "auto"
            }}
          />
        )}
      </div>
      {calldata && (
        <div style={{ marginTop: 16 }}>
          <a
            href={`https://polkadot.js.org/apps/?rpc=${chains[network].ws}#/extrinsics/decode/${calldata}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open Calldata in Polkadot.js Apps
          </a>
        </div>
      )}
      <Header as="h4" style={{ marginTop: 30 }}>
        Error
      </Header>
      <TextArea value={err} style={{ width: "100%", minHeight: 60 }} readOnly />
    </Container>
  );
};

export default ProxyComponent;
