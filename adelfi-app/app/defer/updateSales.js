import { defer } from "@defer/client"
import { unauthenticated } from "../shopify.server";
import { json } from "@remix-run/node";

const API_BASE_URL = "https://adelfi.fly.dev/api";

async function updateSales() {
    const headers = {
        "Authorization": `Bearer ${process.env.PRIVATE_AUTH_TOKEN}`
    }

    const response = await fetch(`${API_BASE_URL}/partnership`, { headers });
    if (!response.ok) {
        throw new Error("Failed to fetch partnership data");
    }

    const partnerships = await response.json();

    const updateResponses = []

    updateResponses.push(partnerships.forEach(async function(partnership) {
        let updateResponse = null
        if (partnership.discountId != null) {
            const { admin } = await unauthenticated.admin(partnership.shop);
            const response = await admin.graphql(
                `#graphql
                  query queryOrders($id: ID!) {
                    orders(query: "created_at:2023-10-16") {
                      edges {
                        node {
                          discountCodes
                          netPaymentSet
                          createdAt
                        }
                      }
                    }
                  }
                `,
                 {
                   variables: {
                   },
                 }
            );

            const {
                data: { orders },
            } = await response.json();

            if (orders != null) {
                let newSales = 0;
                newSales += orders?.edges?.forEach(function(order) {
                    let sales = 0;
                    for (const code of order.node.discountCodes) {
                        if (code.startsWith("Adelfi")) {
                            sales = order.node.netPaymentSet.shopMoney.decimal;
                            break;
                        }
                    }
                    return sales;
                })
                partnership.totalSales += newSales;
                partnership.currSales += newSales;
            }

            const requestBody = {
                data: partnership,
                token: `${process.env.PRIVATE_AUTH_TOKEN}`
            }

            updateResponse = await fetch(`${API_BASE_URL}/partnership`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(requestBody)
            });
        }

        return updateResponse;
    }))

    return updateResponses
}

export default defer(updateSales);