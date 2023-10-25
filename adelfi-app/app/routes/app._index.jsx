import { useEffect } from "react";
import { json } from "@remix-run/node";
import { useActionData, useNavigation, useSubmit, useLoaderData } from "@remix-run/react";
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

import { getPartnership } from "~/models/partnership.server";
import db from "../db.server";
import sendEmail from "./sendEmail";

import { authenticate } from "../shopify.server";

const numDiscounts = 1000;
const endDate = "2023-11-28T12:00:00Z";
const endDateFormatted = (new Date(endDate)).toDateString().substring(3);
const codePrefix = "Adelfi-"
const BASE_URL = "https://adelfi.fly.dev/";

export const loader = async ({ request }) => {
  const { admin, session } = await authenticate.admin(request);
  const partnership = await getPartnership(session.shop, admin.graphql)

  return json({
    partnership,
  });
};

export async function action({ request }) {
  console.log("Action");
  const { admin, session } = await authenticate.admin(request);
  const { shop } = session;
  const partnership = await db.partnership.findFirst({ where: { shop: shop }})

  if (partnership == null || partnership.codes != null) {
    return null
  }

  // Set up bulk operations webhook subscription if it doesn't already exist
  if (partnership.webhookId == null) {
    const webhookId = await subscribeToBulkOperationsWebhook(admin);
    if (webhookId == null) {
      return null;
    } else {
      partnership.webhookId = webhookId;
    }
  }

  const codeLength = 9

  const codesArray = generateCodesArray(numDiscounts, codeLength)
  console.log("We're here...")
  const codesTextFile = arrayToTextFile(codesArray)
  const codesTextFileBuffer = Buffer.from(await codesTextFile.text())
  console.log("Email response: " + JSON.stringify(await sendEmail(shop.split(".")[0], codesTextFileBuffer, true)))

  partnership.codes = Buffer.from(JSON.stringify(codesArray), "utf-8")

  const firstCode = codesArray.pop()

  const codeSets = generateCodes(codesArray)

  const discountJson = await createDiscount(admin, firstCode.code, partnership);

  const discountId = await discountJson.data.discountCodeBasicCreate.codeDiscountNode.id

  partnership.discountId = discountId

  const responses = generateBulkDiscountCodes(admin, codeSets, discountId);

  partnership.isActive = true
  partnership.expires = new Date(endDate)
  partnership.autoRenew = true

  const updatePartnership = await db.partnership.updateMany({ where: { shop: shop }, data: { ...partnership }})

  return json({
    discount: discountJson.data.discountCodeBasicCreate.codeDiscountNode,
    codeSets: codeSets,
    bulkAddCodesResponses: responses,
    partnership: partnership,
    updatePartnership: updatePartnership
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

function DiscountDetailsTable({ title, percentOff, usageLimit, commission }) {
  const rows = [
    [title, numDiscounts, Math.floor(percentOff * 100) + "%", usageLimit, commission, endDateFormatted],
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
            'Next Period',
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
  const loaderData = useLoaderData();
  const partnership = loaderData?.partnership
  console.log("Partnership: " + (partnership != null));
  if (partnership != null) {
  
    const title = partnership?.title
    const percentOff = partnership?.percentOff
    const usageLimit = partnership?.usageLimit
    const commission = partnership?.commission

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

    const generateDiscount = () => {
      console.log('Action button clicked.')
      submit({}, { replace: true, method: "POST" })
    };

    return (
      <Page>
        <ui-title-bar title="Adelfi">
          <></>
          <button variant="primary" onClick={generateDiscount} disabled={partnership.discountId != null}>
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
                      <DiscountDetailsTable title={title} percentOff={percentOff} usageLimit={usageLimit} commission={commission}/>
                      <Text as="p" variant="bodyMd" alignment="center">
                        All codes are generated automatically and sent to our marketing team at Adelfi for distribution.
                      </Text>
                      <Text as="p" variant="bodyMd" alignment="center">
                        Number of Codes is subject to increase at any time due to rising demand. 
                      </Text>
                      <Text as="p" variant="bodyMd" alignment="center">
                        By clicking "Activate Partnership" you agree to adhere to the terms below.
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
                      <Button loading={isLoading} primary onClick={generateDiscount} disabled={partnership.discountId != null}>
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
                    {partnership.totalSales > 0 ? (
                      <VerticalStack gap="2">
                        <Text as="h3" variant="headingMd">
                          Usage
                        </Text>
                        <HorizontalStack gap="3" align="center">
                          <Box
                            padding="4"
                            background="bg-subdued"
                            borderColor="border"
                            borderWidth="1"
                            borderRadius="2"
                            width="25%"
                          >
                            <VerticalStack gap="2">
                              <Text as="h1" variant="headingMd" alignment="center">
                                Total Sales (All Time)
                              </Text>
                              <Text as="h1" variant="headingMd" alignment="center">
                                ${partnership.totalSales.toFixed(2)} USD
                              </Text>
                            </VerticalStack>
                          </Box>
                          <Box
                            padding="4"
                            background="bg-subdued"
                            borderColor="border"
                            borderWidth="1"
                            borderRadius="2"
                            width="25%"
                          >
                            <VerticalStack gap="2">
                              <Text as="h1" variant="headingMd" alignment="center">
                                Commissions (Period)
                              </Text>
                              <Text as="h1" variant="headingMd" alignment="center">
                                ${(Math.floor(partnership.currSales * partnership.commission * 100) / 100).toFixed(2)} USD
                              </Text>
                            </VerticalStack>
                          </Box>
                        </HorizontalStack>
                      </VerticalStack>
                    ) : (<></>)}
                    <VerticalStack gap="2">
                      <Text as="h3" variant="headingMd">
                        Terms
                      </Text>
                      <Text as="p" variant="bodyMd">
                        DO NOT edit or delete any discounts or coupon codes under the title "{title}" or otherwise generated by Adelfi while the partnership is active.
                      </Text>
                      <Text as="p" variant="bodyMd">
                        If you wish to discontinue your partnership, contact Adelfi before the start of the next period. Your service will be terminated once the current period has expired.
                      </Text>
                      <Text as="p" variant="bodyMd">
                        Upon recieving a commission invoice at the end of a period, the amount must be payed in full before the end of the next period or your service will be terminated.
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
  } else {
    return (
      <Page>
        <ui-title-bar title="Adelfi">
          <></>
        </ui-title-bar>
        <VerticalStack gap="5">
          <Layout>
            <Layout.Section>
              <VerticalStack gap="5">
                <Card>
                  <VerticalStack gap="5">
                    <VerticalStack gap="2">
                      <Text as="h2" variant="headingMd">
                        Consider partnering with Adelfi
                      </Text>
                    </VerticalStack>
                    <VerticalStack gap="2">
                      <Text as="h3" variant="headingMd">
                        Partnership Details
                      </Text>
                      <Text as="p" variant="bodyMd">
                        _____
                      </Text>
                    </VerticalStack>
                    <VerticalStack gap="2">
                      <Text as="h3" variant="headingMd">
                        Terms
                      </Text>
                      <Text as="p" variant="bodyMd">
                        _____
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
  }
};

async function createDiscount(admin, myCode, partnership) {
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
          "title": partnership.title,
          "code": myCode,
          "startsAt": (new Date()).toISOString(),
          "endsAt": endDate,
          "customerSelection": {
            "all": true
          },
          "customerGets": {
            "value": {
              "percentage": partnership.percentOff
            },
            "items": {
              "all": true
            }
          },
          "appliesOncePerCustomer": false,
          "usageLimit": partnership.usageLimit
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

async function subscribeToBulkOperationsWebhook(admin) {
  const existingWebhook = await isExistingWebhook(admin);
  if (existingWebhook != null) {
      console.log("Bulk Operations Webhook is already subscribed")
      return existingWebhook;
  }
  const response = await admin.graphql(
    `#graphql
      mutation webhookSubscriptionCreate($topic: WebhookSubscriptionTopic!, $webhookSubscription: WebhookSubscriptionInput!) {
        webhookSubscriptionCreate(topic: $topic, webhookSubscription: $webhookSubscription) {
          userErrors {
            field
            message
          }
          webhookSubscription {
            id
            topic
          }
        }
      }`,
    {
      variables: {
        "topic": "BULK_OPERATIONS_FINISH",
        "webhookSubscription": {
          "callbackUrl": BASE_URL + "processBulkOrders",
          "format": "JSON"
        }
      },
    }
  ); 
  const responseJson = await response.json()
  console.log(responseJson.data.webhookSubscriptionCreate)
  console.log(responseJson.data.webhookSubscriptionCreate.userErrors.message)
  const webhookId = responseJson.data.webhookSubscriptionCreate.webhookSubscription.id;
  console.log("Webhook Created: " + webhookId)
  return webhookId
}

async function isExistingWebhook(admin) {
  const response = await admin.graphql(
    `#graphql
      query {
        webhookSubscriptions(first: 10) {
          edges {
            node {
              id
              topic
              endpoint {
                __typename
                ... on WebhookHttpEndpoint {
                  callbackUrl
                }
              }
            }
          }
        }
      }`,
    {}
  );

  const responseJson = await response.json();
  console.log("responseJson.webhookSubscriptions.edges[0].node.id: " + responseJson.data.webhookSubscriptions.edges[0].node.id)
  if (responseJson.data.webhookSubscriptions.edges == null) {
    return null
  }
  let existingWebhookId = null;
  for (let i = 0; i < responseJson.data.webhookSubscriptions.edges.length; i++) {
    const topic = responseJson.data.webhookSubscriptions.edges[i].node.topic
    console.log("topic: " + topic);
    if (topic == "BULK_OPERATIONS_FINISH") {
      const id = responseJson.data.webhookSubscriptions.edges[i].node.id
      console.log("id: " + id);
      const callbackUrl = responseJson.data.webhookSubscriptions.edges[i].node.endpoint.callbackUrl
      console.log("callbackUrl: " + callbackUrl);
      if (callbackUrl.substring(callbackUrl.lastIndexOf("/")) == "/processBulkOrders") {
        existingWebhookId = id
      } else {
        deleteExistingWebhook(admin, id)
      }
    }
  }
  return existingWebhookId;
}

async function deleteExistingWebhook(admin, id) {
  const response = await admin.graphql(
    `#graphql
      mutation webhookSubscriptionDelete($id: ID!) {
        webhookSubscriptionDelete(id: $id) {
          userErrors {
            field
            message
          }
          deletedWebhookSubscriptionId
        }
      }`,
    {
      variables: {
        id: id
      }
    }
  );

  const responseJson = await response.json();
  const deletedSubscriptionId = responseJson?.webhookSubscriptionDelete?.deletedWebhookSubscriptionId;
  console.log("DELETED webhook subscription: " + deletedSubscriptionId)
  return deletedSubscriptionId;
}

// async function sendEmail(shop, codesTextFileBuffer) {
//   try {
//     const transporter = nodemailer.createTransport({
//       service: "Gmail",
//       auth: {
//         user: "mglum@adelfi.shop",
//         pass: EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: "mglum@adelfi.shop",
//       to: "mglum@adelfi.shop",
//       subject: "Discounts for " + shop,
//       text: "Shop: " + shop + "\n\n(Automatic Discount Generator)",
//       attachments: [
//         {
//           filename: shop + "_codes.txt",
//           content: codesTextFileBuffer,
//         }
//       ]
//     };

//     const info = await transporter.sendMail(mailOptions);

//     return json({ message: "Email sent successfully", info });
//   } catch (error) {
//     console.error("Email sending failed", error);
//     return json({ error: "Email sending failed", details: error });
//   }
// }

async function queryCurrentBulkOperation(admin) {
  const response = await admin.graphql(
    `#graphql
      query {
        currentBulkOperation(type: QUERY) {
          id
          type
          status
        }
      }`,
    {}
  );

  const responseJson = await response.json();
  console.log("responseJson: " + JSON.stringify(responseJson))
  if (responseJson.data.currentBulkOperation.id == null) {
    return null
  }
  return responseJson.data.currentBulkOperation.id;
}

async function cancelBulkOperation(admin, id) {
  const response = await admin.graphql(
    `#graphql
      mutation bulkOperationCancel($id: ID!) {
        bulkOperationCancel(id: $id) {
          bulkOperation{
            id
          }
        }
      }`,
    {
      variables: {
        id: id
      }
    }
  );

  const responseJson = await response.json();
  const cancelledOperationId = responseJson?.data?.bulkOperationCancel.bulkOperation.id;
  console.log("CANCELLED bulk operation: " + cancelledOperationId)
  return cancelledOperationId;
}