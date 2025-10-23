import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Input,
  Form,
  TextArea,
  Header,
  Loader,
  Button,
  Grid,
  Icon,
  Message,
} from "semantic-ui-react";
import { subProvider } from "../web3/polkadotAPI";

interface Transfer {
  id: number;
  destAccount: string;
  amount: string;
}

type NetworkKey = "tanssi"; // extend if you add more networks

const chains: Record<NetworkKey, { ws: string; token: string }> = {
  tanssi: {
    ws: "wss://services.tanssi-mainnet.network/tanssi",
    token: "TANSSI",
  },
};

// simple debounce hook (value -> debouncedValue after delay)
function useDebounce<T>(value: T, delay = 750) {
  const [debounced, setDebounced] = React.useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function TransferRow({
  transfer,
  updateTransfer,
  removeTransfer,
  tokenLabel,
  canRemove,
}: {
  transfer: Transfer;
  updateTransfer: (id: number, field: "destAccount" | "amount", value: string) => void;
  removeTransfer: (id: number) => void;
  tokenLabel: string;
  canRemove: boolean;
}) {
  // local, immediate typing state
  const [localDest, setLocalDest] = React.useState(transfer.destAccount ?? "");
  const [localAmount, setLocalAmount] = React.useState(transfer.amount ?? "");

  // keep local state in sync if parent overwrites (CSV import / clear)
  useEffect(() => setLocalDest(transfer.destAccount ?? ""), [transfer.id, transfer.destAccount]);
  useEffect(() => setLocalAmount(transfer.amount ?? ""), [transfer.id, transfer.amount]);

  // debounce the local values
  const debouncedDest = useDebounce(localDest, 300);
  const debouncedAmount = useDebounce(localAmount, 300);

  // push debounced dest to parent only when changed
  useEffect(() => {
    if (debouncedDest !== transfer.destAccount) {
      updateTransfer(transfer.id, "destAccount", debouncedDest);
    }
  }, [debouncedDest, transfer.id, transfer.destAccount, updateTransfer]);

  // push debounced amount to parent only when changed
  useEffect(() => {
    if (debouncedAmount !== transfer.amount) {
      updateTransfer(transfer.id, "amount", debouncedAmount);
    }
  }, [debouncedAmount, transfer.id, transfer.amount, updateTransfer]);

  return (
    <div
      style={{
        marginBottom: 15,
        padding: 15,
        border: "1px solid #e0e0e0",
        borderRadius: 5,
      }}
    >
      <Grid columns={3} stackable>
        <Grid.Column width={7}>
          <Form.Field>
            <label>Destination Account</label>
            <Input
              placeholder="Enter Destination Account..."
              value={localDest}
              onChange={(e) => setLocalDest(e.target.value)}
              onKeyDown={(e) => {
                // prevent form submit (which clears the row)
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </Form.Field>
        </Grid.Column>

        <Grid.Column width={7}>
          <Form.Field>
            <label>Amount</label>
            <Input
              placeholder="Enter Amount..."
              value={localAmount}
              label={tokenLabel}
              type="text"
              inputMode="decimal"
              onChange={(e) => setLocalAmount(e.target.value)}
              onKeyDown={(e) => {
                // prevent form submit (which clears the row)
                if (e.key === "Enter") e.preventDefault();
              }}
            />
          </Form.Field>
        </Grid.Column>

        <Grid.Column width={2}>
          {canRemove && (
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
  );
}

const ProxyComponent = ({ network }: { network: NetworkKey }) => {
  const [proxyAccount, setProxyAccount] = useState("");
  const [transfers, setTransfers] = useState<Transfer[]>([
    { id: 1, destAccount: "", amount: "" },
  ]);
  const [calldata, setCalldata] = useState("");
  const [err, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextId, setNextId] = useState(2);
  const [csvUploadMessage, setCsvUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Rebuild calldata when inputs are fully filled and actually changed
  useEffect(() => {
    const allTransfersValid = transfers.every((t) => t.destAccount && t.amount);
    if (proxyAccount && transfers.length > 0 && allTransfersValid) {
      constructCall();
    } else {
      setCalldata(""); // clear if not all valid
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proxyAccount, transfers]);

  const addTransfer = () => {
    setTransfers((prev) => [...prev, { id: nextId, destAccount: "", amount: "" }]);
    setNextId((n) => n + 1);
  };

  const removeTransfer = (id: number) => {
    setTransfers((prev) => (prev.length > 1 ? prev.filter((t) => t.id !== id) : prev));
  };

  const updateTransfer = (
    id: number,
    field: "destAccount" | "amount",
    value: string
  ) => {
    setTransfers((prev) => {
      // avoid unnecessary state updates if value didn't change
      let changed = false;
      const next = prev.map((t) => {
        if (t.id !== id) return t;
        if (t[field] === value) return t;
        changed = true;
        return { ...t, [field]: value };
      });
      return changed ? next : prev;
    });
  };

  const handleCSVUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setCsvUploadMessage("");

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.trim().split("\n");

        if (lines.length === 0) {
          setCsvUploadMessage("CSV file is empty");
          return;
        }

        const newTransfers: Transfer[] = [];
        let currentId = 1;
        let hasErrors = false;

        lines.forEach((line, index) => {
          const [addressRaw, amountRaw] = line.split(",").map((item) => (item ?? "").trim());
          const address = addressRaw ?? "";
          const amount = amountRaw ?? "";

          // header?
          if (
            index === 0 &&
            address.toLowerCase() === "address" &&
            amount.toLowerCase() === "amount"
          ) {
            return;
          }

          if (!address || !amount) {
            setCsvUploadMessage(
              `Error on line ${index + 1}: Invalid format. Expected "address,amount"`
            );
            hasErrors = true;
            return;
          }

          if (isNaN(Number(amount))) {
            setCsvUploadMessage(
              `Error on line ${index + 1}: Amount "${amount}" is not a valid number`
            );
            hasErrors = true;
            return;
          }

          newTransfers.push({
            id: currentId++,
            destAccount: address,
            amount,
          });
        });

        if (!hasErrors) {
          setTransfers(newTransfers);
          setNextId(currentId);
          setCsvUploadMessage(`Successfully imported ${newTransfers.length} transfers from CSV`);
        }
      } catch (error: any) {
        setCsvUploadMessage("Error reading CSV file: " + (error?.message ?? String(error)));
      }
    };

    reader.onerror = () => {
      setCsvUploadMessage("Error reading file");
    };

    reader.readAsText(file);

    // allow re-upload of the same file
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearAllTransfers = () => {
    setTransfers([{ id: 1, destAccount: "", amount: "" }]);
    setNextId(2);
    setCsvUploadMessage("");
    setCalldata("");
    setErrorMessage("");
  };

  const constructCall = async () => {
    setErrorMessage("");
    setLoading(true);
    setCalldata("");

    try {
      const api = (await subProvider(chains[network].ws)) as any;

      // decimals (e.g., 12) -> use BigInt-safe exponent
      const decimals: number = api.registry.chainDecimals[0];
      const factor = BigInt(10) ** BigInt(decimals);

      let tx;
      if (transfers.length === 1) {
        const amountInUnits = BigInt(transfers[0].amount) * factor;
        const transferCall = api.tx.balances.transferKeepAlive(
          transfers[0].destAccount,
          amountInUnits
        );
        tx = await api.tx.proxy.proxy(proxyAccount, null, transferCall);
      } else {
        const proxyCalls = transfers.map((t) => {
          const amountInUnits = BigInt(t.amount) * factor;
          const transferCall = api.tx.balances.transferKeepAlive(t.destAccount, amountInUnits);
          return api.tx.proxy.proxy(proxyAccount, null, transferCall);
        });

        tx = api.tx.utility.batch(proxyCalls);
      }

      setCalldata(tx.method.toHex());
    } catch (err: any) {
      setErrorMessage(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container style={{ maxWidth: 700, marginTop: 30 }}>
      <Form
        onSubmit={(e) => {
          // prevent enter key from submitting & clearing inputs
          e.preventDefault();
        }}
      >
        <Form.Field>
          <label>Proxy Account</label>
          <Input
            placeholder="Enter Proxy Account..."
            value={proxyAccount}
            onChange={(e) => setProxyAccount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.preventDefault();
            }}
          />
        </Form.Field>

        <Header as="h4" style={{ marginTop: 20, marginBottom: 10 }}>
          Transfers
        </Header>

        {/* CSV Upload Section */}
        <div
          style={{
            marginBottom: 20,
            padding: 15,
            backgroundColor: "#f8f9fa",
            borderRadius: 5,
          }}
        >
          <Header as="h5" style={{ marginTop: 0, marginBottom: 10 }}>
            Import from CSV
          </Header>
          <p style={{ fontSize: "12px", color: "#666", marginBottom: 10 }}>
            Upload a CSV file with format: address,amount (one transfer per line). Optional header row is supported.
          </p>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
            <div>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleCSVUpload}
                ref={fileInputRef}
                style={{ marginBottom: 5 }}
              />
            </div>
            <Button size="small" onClick={clearAllTransfers} title="Clear all transfers and start fresh">
              Clear All
            </Button>
          </div>
          {csvUploadMessage && (
            <Message
              positive={csvUploadMessage.includes("Successfully")}
              negative={csvUploadMessage.includes("Error")}
              size="small"
              style={{ marginTop: 10 }}
            >
              {csvUploadMessage}
            </Message>
          )}
        </div>

        {transfers.map((t) => (
          <TransferRow
            key={t.id}
            transfer={t}
            updateTransfer={updateTransfer}
            removeTransfer={removeTransfer}
            tokenLabel={chains[network]?.token}
            canRemove={transfers.length > 1}
          />
        ))}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginTop: 10,
            marginBottom: 20,
          }}
        >
          <Button
            icon
            color="green"
            onClick={addTransfer}
            style={{
              width: "32px",
              height: "32px",
              padding: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
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
              margin: "auto",
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
