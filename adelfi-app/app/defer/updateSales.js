import { defer } from "@defer/client"
import shopify from '../shopify.server';
import db from "../db.server"
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";

// export const loader = async ({ request }) => {
//     const { admin } = await shopify.unauthenticated.admin(request);
//     return json({admin: admin})
// };

async function updateSales() {
    //const loaderData = useLoaderData();
    //const shop = loaderData?.admin.graphql

    const partnerships = await db.partnership.findMany({
        select: {
            shop: true,
            discountId: true,
            totalSales: true,
            currSales: true
        }
    });

    const updateResponses = []

    updateResponses.push(partnerships.forEach(async function(partnership) {
        let updateResponse = null
        if (partnership.discountId != null) {
            const { admin } = await shopify.unauthenticated.admin("https://admin.shopify.com/store/quickstart-9f306b3f/apps/adelfi-app-3/app");
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
                if (partnership.totalSales == null) {
                    partnership.totalSales = newSales
                    partnership.currSales = newSales
                } else {
                    partnership.totalSales += newSales;
                    (partnership.currSales != null) ? partnership.currSales += newSales : partnership.currSales = newSales;
                }
            }

            updateResponse = await db.partnership.updateMany({ where: { shop: partnership.shop }, data: { ...partnership }})
        }

        return updateResponse;
    }))

    return new Response(updateResponses.toString(), {
        status: 200,
    });
}

export default defer(updateSales);