import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  VerticalStack,
  Card,
  Button,
  HorizontalStack,
  Box,
  Divider,
  List,
  Link,
  LegacyCard,
  DataTable
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

const numDiscounts = 10000;
const percentOff = 0.25;
const usageLimit = 5;
const endDate = "2023-11-28T12:00:00Z";
const endDateFormatted = (new Date(endDate)).toDateString();
const commissionRate = 0.1;

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(
    `#graphql
      mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
        discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
          codeDiscountNode {
            id
            codeDiscount {
              ... on DiscountCodeBasic {
                title
                codes(first: 10) {
                  nodes {
                    code
                  }
                }
                startsAt
                endsAt
                customerSelection {
                  ... on DiscountCustomerAll {
                    allCustomers
                  }
                }
                customerGets {
                  value {
                    ... on DiscountPercentage {
                      percentage
                    }
                  }
                  items {
                    ... on AllDiscountItems {
                      allItems
                    }
                  }
                }
                appliesOncePerCustomer
              }
            }
          }
          userErrors {
            field
            code
            message
          }
        }
      }`,
    {
      variables: {
        "basicCodeDiscount": {
          "title": "25% off with Adelfi",
          "code": "Adelfi-2023",
          "startsAt": "2023-09-28T12:00:00Z",
          "endsAt": endDate,
          "customerSelection": {
            "all": true
          },
          "customerGets": {
            "value": {
              "percentage": percentOff
            },
            "items": {
              "all": true
            }
          },
          "appliesOncePerCustomer": true
        }
      },
    }
  );

  const responseJson = await response.json();

  let remainingDiscounts = numDiscounts - 1

  while (remainingDiscounts > 0) {
    let codes = []
    for (let i = 0; i < 100; i++) {
      if (remainingDiscounts > 0) {
        codes[i] = {"code": "Adelfi-" + makeCode(9)}
        remainingDiscounts--;
      }
    }

    await admin.graphql(
      `#graphql
        mutation discountRedeemCodeBulkAdd($discountId: ID!, $codes: [DiscountRedeemCodeInput!]!) {
          discountRedeemCodeBulkAdd(discountId: $discountId, codes: $codes) {
            bulkCreation {
              id
            }
            userErrors {
              code
              field
              message
            }
          }
        }`,
      {
        variables: {
          "discountId": await responseJson.data.discountCodeBasicCreate.codeDiscountNode.id,
          "codes": codes
        },
      }
    );
  }

  return json({
    discount: responseJson.data.discountCodeBasicCreate.codeDiscountNode,
  });

}

function makeCode(length) {
  let result = '';
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

function DiscountDetailsTable() {
  const rows = [
    [numDiscounts, percentOff, usageLimit, commissionRate, endDateFormatted],
  ];

  return (
    <Page title="Discount Details">
      <LegacyCard>
        <DataTable
          columnContentTypes={[
            'numeric',
            'numeric',
            'numeric',
            'numeric',
            'text',
          ]}
          headings={[
            'Number of Codes',
            'Percent Discount',
            'Usage Limit',
            'Commission Rate',
            'Renewal Date',
          ]}
          rows={rows}
        />
      </LegacyCard>
    </Page>
  );
}

function StyledBox({ children }) {
  return (
    <Box
      as="span"
      padding="025"
      paddingInlineStart="1"
      paddingInlineEnd="1"
      background="bg-subdued"
      borderWidth="1"
      borderColor="border"
      borderRadius="1"
    >
      <code>{children}</code>
    </Box>
  );
}

export default function Index() {
  const nav = useNavigation();
  const actionData = useActionData();
  const submit = useSubmit();

  const isLoading =
    ["loading", "submitting"].includes(nav.state) && nav.formMethod === "POST";

  const discountId = actionData?.discount?.id.replace(
    "gid://shopify/DiscountCodeNode/",
    ""
  );

  useEffect(() => {
    if (discountId) {
      shopify.toast.show("Discount created");
    }
  }, [discountId]);

  const generateDiscount = () => submit({}, { replace: true, method: "POST" });

  return (
    <Page>
      <ui-title-bar title="Adelfi">
        <button variant="primary" onClick={generateDiscount}>
          Generate Discount
        </button>
      </ui-title-bar>
      <VerticalStack gap="5">
        <Layout>
          <Layout.Section>
            <VerticalStack gap="5">
              <Card>
                <VerticalStack gap="5">
                  <VerticalStack gap="2">
                    <Text as="h2" variant="headingMd">
                      Congrats on partnering with Adelfi 🎉
                    </Text>
                    <Text variant="bodyMd" as="p">
                      Your partnership details are listed below.
                    </Text>
                  </VerticalStack>
                  <VerticalStack gap="2">
                    <Text as="h3" variant="headingMd">
                      Discount
                    </Text>
                    <DiscountDetailsTable />
                  </VerticalStack>
                  <VerticalStack gap="2">
                    <Text as="h3" variant="headingMd">
                      Terms
                    </Text>
                    <Text as="p" variant="bodyMd">
                      Once all of the discount codes are generated, they will be sent directly to our marketing team at Adelfi for distribution.
                    </Text>
                  </VerticalStack>
                  <HorizontalStack gap="3" align="end">
                    {actionData?.discount && (
                      <Button
                        url={`shopify:admin/discounts/${discountId}`}
                        target="_blank"
                      >
                        View Discount
                      </Button>
                    )}
                    <Button loading={isLoading} primary onClick={generateDiscount}>
                      Generate Discount
                    </Button>
                  </HorizontalStack>
                  {actionData?.discount && (
                    <Box
                      padding="4"
                      background="bg-subdued"
                      borderColor="border"
                      borderWidth="1"
                      borderRadius="2"
                      overflowX="scroll"
                    >
                      <pre style={{ margin: 0 }}>
                        <code>{JSON.stringify(actionData.discount, null, 2)}</code>
                      </pre>
                    </Box>
                  )}
                </VerticalStack>
              </Card>
            </VerticalStack>
          </Layout.Section>
          <Layout.Section secondary>
            <VerticalStack gap="5">
              <Card>
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    App template specs
                  </Text>
                  <VerticalStack gap="2">
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Framework
                      </Text>
                      <Link url="https://remix.run" target="_blank">
                        Remix
                      </Link>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Database
                      </Text>
                      <Link url="https://www.prisma.io/" target="_blank">
                        Prisma
                      </Link>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Interface
                      </Text>
                      <span>
                        <Link url="https://polaris.shopify.com" target="_blank">
                          Polaris
                        </Link>
                        {", "}
                        <Link
                          url="https://shopify.dev/docs/apps/tools/app-bridge"
                          target="_blank"
                        >
                          App Bridge
                        </Link>
                      </span>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        API
                      </Text>
                      <Link
                        url="https://shopify.dev/docs/api/admin-graphql"
                        target="_blank"
                      >
                        GraphQL API
                      </Link>
                    </HorizontalStack>
                  </VerticalStack>
                </VerticalStack>
              </Card>
              <Card>
                <VerticalStack gap="2">
                  <Text as="h2" variant="headingMd">
                    Next steps
                  </Text>
                  <List spacing="extraTight">
                    <List.Item>
                      Build an{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/getting-started/build-app-example"
                        target="_blank"
                      >
                        {" "}
                        example app
                      </Link>{" "}
                      to get started
                    </List.Item>
                    <List.Item>
                      Explore Shopify’s API with{" "}
                      <Link
                        url="https://shopify.dev/docs/apps/tools/graphiql-admin-api"
                        target="_blank"
                      >
                        GraphiQL
                      </Link>
                    </List.Item>
                  </List>
                </VerticalStack>
              </Card>
            </VerticalStack>
          </Layout.Section>
        </Layout>
      </VerticalStack>
    </Page>
  );
}
