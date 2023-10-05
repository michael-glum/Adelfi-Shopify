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
  DataTable,
  Badge,
} from "@shopify/polaris";

import { authenticate } from "../shopify.server";

const numDiscounts = 1000;
const percentOff = 0.25;
const discountTitle = Math.round(percentOff * 100) + "% off with Adelfi"
const usageLimit = 3;
const endDate = "2023-11-28T12:00:00Z";
const endDateFormatted = (new Date(endDate)).toDateString().substring(3);
const commissionRate = 0.1;
const codePrefix = "Adelfi-"

export const loader = async ({ request }) => {
  await authenticate.admin(request);

  return null;
};

export async function action({ request }) {
  const { admin } = await authenticate.admin(request);
  const codeLength = 9

  const codesArray = generateCodesArray(numDiscounts, codeLength)

  const firstCode = codesArray.pop()

  const codeSets = generateCodes(codesArray)

  const discountJson = await createDiscount(admin, firstCode.code);

  const discountId = await discountJson.data.discountCodeBasicCreate.codeDiscountNode.id

  const responses = generateBulkDiscountCodes(admin, codeSets, discountId);

  return json({
    discount: discountJson.data.discountCodeBasicCreate.codeDiscountNode,
    codeSets: codeSets,
    bulkAddCodesResponses: responses
  });
}

function generateCodesArray(numberOfCodes, codeLength) {
  const codes = new Set()

  while (codes.size < numberOfCodes) {
    codes.add({code: codePrefix + makeCode(codeLength)})
  }

  return Array.from(codes)
}

function generateCodes(codesArray) {

  const setCount = Math.ceil(codesArray.length / 100)
  const codeSets = [];

  for (let i = 0; i < setCount - 1; i++) {
    const startIndex = i * 100;
    const endIndex = (i + 1) * 100;
    const codeSet = codesArray.slice(startIndex, endIndex)
    codeSets.push(codeSet)
  }

  const lastIndex = setCount - 1;
  const lastSet = codesArray.slice(lastIndex * 100);
  codeSets.push(lastSet);

  return codeSets;
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
    [discountTitle, numDiscounts, Math.floor(percentOff * 100) + "%", usageLimit, commissionRate, endDateFormatted],
  ];

  return (
    <Page>
      <LegacyCard>
        <DataTable
          columnContentTypes={[
            'text',
            'numeric',
            'numeric',
            'numeric',
            'numeric',
            'numeric',
          ]}
          headings={[
            'Discount Title',
            'Number of Codes',
            'Percent Off',
            'Usage Limit',
            'Commission Rate',
            'Renewal Date',
          ]}
          rows={rows}
        />
      </LegacyCard>
    </Page>
  );
};

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
          Activate Partnership
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
                      We're thrilled to have you on board!
                    </Text>
                  </VerticalStack>
                  <VerticalStack gap="2">
                    <Text as="h3" variant="headingMd">
                      Partnership Details
                    </Text>
                    <DiscountDetailsTable />
                    <Text as="p" variant="bodyMd" alignment="center">
                      All codes are generated automatically and sent to our marketing team at Adelfi for distribution.
                    </Text>
                    <Text as="p" variant="bodyMd" alignment="center">
                      Number of Codes is subject to increase at any time due to rising demand. 
                    </Text>
                    <Text as="p" variant="bodyMd" alignment="center">
                      Clicking "Activate Partnership" will begin the generation process.
                    </Text>
                  </VerticalStack>
                  <HorizontalStack gap="3" align="center">
                    {actionData?.discount && (
                      <Button
                        url={`shopify:admin/discounts/${discountId}`}
                        target="_blank"
                      >
                        View Discount
                      </Button>
                    )}
                    <Button loading={isLoading} primary onClick={generateDiscount}>
                      Activate Partnership
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
                  <VerticalStack gap="2">
                    <Text as="h3" variant="headingMd">
                      Terms
                    </Text>
                    <Text as="p" variant="bodyMd">
                      DO NOT edit or delete any discounts or coupon codes under the title "{discountTitle}" or otherwise generated by Adelfi before the renewal date.
                    </Text>
                    <Text as="p" variant="bodyMd">
                      If you wish to discontinue your partnership, contact Adelfi before your renewal date. Your service will be terminated once the current partnership period has expired.
                    </Text>
                  </VerticalStack>
                </VerticalStack>
              </Card>
            </VerticalStack>
          </Layout.Section>
          <Layout.Section>
            <VerticalStack gap="5">
              <Card>
                <VerticalStack gap="2">
                  <HorizontalStack align="space-between">
                    <Text as="h2" variant="headingMd">
                      Your support team at Adelfi
                    </Text>
                  </HorizontalStack>
                  <VerticalStack gap="2">
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Katie
                      </Text>
                      <Badge>
                        Marketing and Partnerships
                      </Badge>
                      <Link url="mailto:kellsworth@adelfi.shop" target="_blank">
                        kellsworth@adelfi.shop
                      </Link>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Michael
                      </Text>
                      <Badge>
                        Technical Support
                      </Badge>
                      <Link url="mailto:mglum@adelfi.shop" target="_blank">
                        mglum@adelfi.shop
                      </Link>
                    </HorizontalStack>
                    <Divider />
                    <HorizontalStack align="space-between">
                      <Text as="span" variant="bodyMd">
                        Info
                      </Text>
                      <Badge>
                        General Info
                      </Badge>
                      <Link url="mailto:info@adelfi.shop" target="_blank">
                        info@adelfi.shop
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
                      Ask us about our additional sorority partnership {" "}
                      <Link
                        url="mailto:kellsworth@adelfi.shop"
                        target="_blank"
                      >
                        opportunities
                      </Link>
                    </List.Item>
                    <List.Item>
                      Explore our wesbite @ {" "}
                      <Link
                        url="https://www.adelfi.shop"
                        target="_blank"
                      >
                        adelfi.shop
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
};

async function createDiscount(admin, myCode) {
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
                usageLimit
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
          "code": myCode,
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
          "appliesOncePerCustomer": false,
          "usageLimit": usageLimit
        }
      },
    }
  );

  const responseJson = await response.json();

  return responseJson;
}

async function generateBulkDiscountCodes(admin, codeSets, discountId) {
  const responses = []

  while (responses.length < codeSets.length) {
    const codes = codeSets[responses.length]

    const response = await admin.graphql(
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
          "discountId": discountId,
          "codes": codes
        },
      }
    ); 
    const responseJson = await response.json()
    if (responseJson.data.discountRedeemCodeBulkAdd.bulkCreation != null) {
      responses.push(responseJson)
    }
  }

  return responses
}

function arrayToTextFile(data) {
  const textContent = data.join(',');
  const blob = new Blob([textContent], { type: 'text/plain'});

  return blob;
}