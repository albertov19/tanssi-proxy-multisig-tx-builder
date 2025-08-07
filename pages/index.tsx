import React, { useEffect, useState } from "react";
import { Container, Dropdown, Menu } from "semantic-ui-react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import ProxyComponent from "../components/proxy-component";

const Networks = [
  {
    key: "Tanssi",
    text: "Tanssi",
    value: "tanssi",
    image: { avatar: true, src: "tanssi.png" },
  },
];

const tanssiMultisigTxBuilder = () => {
  const router = useRouter();

  const [network, setNetwork] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Set the Intial State of the Network based on Default Param or Route
    const { network: networkQueryParam } = router.query;
    if (!networkQueryParam && router.isReady) {
      handleChange(null, Networks[0]);
    }

    if (router.query.network && network !== router.query.network) {
      setNetwork((router.query.network as string).toLocaleLowerCase());
    }
  }, [router.query.network]);

  const handleChange = (e, { value }) => {
    // Update the URL query param when the dropdown selection changes
    router.push(`/?network=${value}`);

    setNetwork(value);
  };

  return (
    <div
      style={{
        paddingLeft: "20px",
        paddingRight: "20px",
        paddingTop: "10px",
        overflowX: "auto",
      }}
    >
      <Container>
        <Head>
          <title>Tanssi Multisig Proxy Tx Builder</title>
          <link rel="icon" type="image/svg" sizes="32x32" href="/favicon.svg" />
          <link
            rel="stylesheet"
            href="//cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css"
          />
        </Head>
        <Menu
          secondary
          stackable
          size="large"
          style={{
            border: "none",
            boxShadow: "none",
            marginTop: 20,
            marginBottom: 10,
          }}
        >
          <Menu.Item header>
            <Link
              href="/"
              style={{
                color: "inherit",
                textDecoration: "none",
                fontWeight: "bold",
                fontSize: 22,
              }}
            >
              Tanssi Multisig Proxy Tx Builder
            </Link>
          </Menu.Item>
          <Menu.Menu position="right">
            <Menu.Item>
              <Dropdown
                placeholder="Select Network"
                selection
                options={Networks}
                onChange={handleChange}
                value={network}
                disabled={loading}
                style={{ minWidth: 170 }}
              />
            </Menu.Item>
          </Menu.Menu>
        </Menu>
        {network ? (
          network == "tanssi" ? (
            <ProxyComponent network={network} />
          ) : (
            <h3>Network must be Tanssi</h3>
          )
        ) : (
          ""
        )}
        <p>
          Don't judge the code :) as it is for demonstration purposes only. You
          can check the source code &nbsp;
          <a href="https://github.com/albertov19/tanssi-proxy-multisig-tx-builder">here</a>
        </p>
        <br />
      </Container>
    </div>
  );
};

export default tanssiMultisigTxBuilder;
