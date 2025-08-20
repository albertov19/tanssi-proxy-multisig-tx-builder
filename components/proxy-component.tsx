import React, { useState, useEffect } from "react";
import { Container, Input, Form, TextArea, Header, Loader, Button, Grid, Icon } from "semantic-ui-react";
import { subProvider } from "../web3/polkadotAPI";

interface Transfer {
  id: number;
  destAccount: string;
  amount: string;
}

const ProxyComponent = ({ network }) => {
  const [proxyAccount, setProxyAccount] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([{ id: 1, destAccount: "", amount: "" }]);
  const [calldata, setCalldata] = useState("");
  const [err, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(2);

  const chains = {
    tanssi: {
      ws: "wss://services.tanssi-mainnet.network/tanssi",
      token: "TANSSI"
    },
    // ...add more networks if needed
  };

  // Effect runs when proxy account and all transfers have values
  useEffect(() => {
    const allTransfersValid = transfers.every(t => t.destAccount && t.amount);
    if (proxyAccount && transfers.length > 0 && allTransfersValid) {
      constructCall();
    }
    // eslint-disable-next-line
  }, [proxyAccount, transfers]);

  const addTransfer = () => {
    setTransfers([...transfers, { id: nextId, destAccount: "", amount: "" }]);
    setNextId(nextId + 1);
  };

  const removeTransfer = (id: number) => {
    if (transfers.length > 1) {
      setTransfers(transfers.filter(t => t.id !== id));
    }
  };

  const updateTransfer = (id: number, field: 'destAccount' | 'amount', value: string) => {
    setTransfers(transfers.map(t => 
      t.id === id ? { ...t, [field]: value } : t
    ));
  };

  const constructCall = async () => {
    setErrorMessage("");
    setLoading(true);
    setCalldata(""); // clear previous calldata while loading

    try {
      const api = (await subProvider(chains[network].ws)) as any;

      // Transform Decimals
      const decimals = api.registry.chainDecimals[0];
      
      // Create transfer calls for each transfer
      const transferCalls = transfers.map(transfer => {
        const amountInUnits = BigInt(transfer.amount) * BigInt(10 ** decimals);
        return api.tx.balances.transferKeepAlive(transfer.destAccount, amountInUnits);
      });

      let tx;
      if (transfers.length === 1) {
        // Single transfer - direct proxy call
        tx = await api.tx.proxy.proxy(
          proxyAccount,
          null,
          transferCalls[0]
        );
      } else {
        // Multiple transfers - use utility.batch
        const batchCall = api.tx.utility.batch(transferCalls);
        tx = await api.tx.proxy.proxy(
          proxyAccount,
          null,
          batchCall
        );
      }

      setCalldata(tx.method.toHex());
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: 700, marginTop: 30 }}>
      <Form>
        <Form.Field>
          <label>Proxy Account</label>
          <Input
            placeholder="Enter Proxy Account..."
            value={proxyAccount}
            onChange={(e) => setProxyAccount(e.target.value)}
          />
        </Form.Field>
        
        <Header as="h4" style={{ marginTop: 20, marginBottom: 10 }}>
          Transfers
        </Header>
        
        {transfers.map((transfer, index) => (
          <div key={transfer.id} style={{ marginBottom: 15, padding: 15, border: '1px solid #e0e0e0', borderRadius: 5 }}>
            <Grid columns={3} stackable>
              <Grid.Column width={7}>
                <Form.Field>
                  <label>Destination Account</label>
                  <Input
                    placeholder="Enter Destination Account..."
                    value={transfer.destAccount}
                    onChange={(e) => updateTransfer(transfer.id, 'destAccount', e.target.value)}
                  />
                </Form.Field>
              </Grid.Column>
              <Grid.Column width={7}>
                <Form.Field>
                  <label>Amount</label>
                  <Input
                    placeholder="Enter Amount..."
                    value={transfer.amount}
                    label={chains[network]?.token}
                    onChange={(e) => updateTransfer(transfer.id, 'amount', e.target.value)}
                  />
                </Form.Field>
              </Grid.Column>
              <Grid.Column width={2}>
                {transfers.length > 1 && (
                  <Button 
                    icon 
                    color="red" 
                    onClick={() => removeTransfer(transfer.id)}
                    style={{ marginTop: 25 }}
                  >
                    <Icon name="trash" />
                  </Button>
                )}
              </Grid.Column>
            </Grid>
          </div>
        ))}
        
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, marginBottom: 20 }}>
          <Button 
            icon 
            color="green"
            onClick={addTransfer}
            style={{ 
              width: '32px', 
              height: '32px', 
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Icon name="plus" />
          </Button>
        </div>
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
