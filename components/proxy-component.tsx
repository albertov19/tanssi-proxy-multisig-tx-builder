import React, { useState, useEffect } from 'react';
import { Container, Input, Form, TextArea, Header } from 'semantic-ui-react';
import { subProvider } from '../web3/polkadotAPI';


const ProxyComponent = ( {network}) => {
  const [proxyAccount, setProxyAccount] = useState('');
  const [destAccount, setDestAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [calldata, setCalldata] = useState('');
  const [err, setErrorMessage] = useState('');


  // Effect runs when *all three* fields have values
  useEffect(() => {
    if (proxyAccount && destAccount && amount) {
      constructCall();
    }
    // eslint-disable-next-line
  }, [proxyAccount, destAccount, amount]);

  const constructCall = async () => {
    setErrorMessage('');

    try {
      const api = await subProvider(network) as any;

      // Transform Decimals
      const decimals = api.registry.chainDecimals[0];
      const amountInUnits = BigInt(amount) * BigInt(10 ** decimals);

      // Proxy Calldata
      const tx = await api.tx.proxy.proxy(proxyAccount, null, await api.tx.balances.transferKeepAlive(destAccount, amountInUnits));

      setCalldata(tx.method.toHex());

    } catch (err) {
      setErrorMessage(err.message);
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
            type="number"
            onChange={(e) => setAmount(e.target.value)}
          />
        </Form.Field>
      </Form>
      <Header as="h4" style={{ marginTop: 30 }}>Calldata</Header>
      <TextArea
        value={calldata}
        placeholder="Calldata will be shown here..."
        style={{ width: '100%', minHeight: 60 }}
        readOnly
      />
      <TextArea
        value={err}
        style={{ width: '100%', minHeight: 60 }}
        readOnly
      />
    </Container>
  );
};

export default ProxyComponent;