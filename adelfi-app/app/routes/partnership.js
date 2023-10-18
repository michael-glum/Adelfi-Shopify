import { json } from "@remix-run/node";
import db from "../db.server"
import { unauthenticated } from "../shopify.server";

const PRIVATE_AUTH_TOKEN = process.env.PRIVATE_AUTH_TOKEN;

// yighay
export const action = async ({ request }) => {
    if (request.method === "POST") {
        const { token } = await request.json();
        console.log("Token: " + token)
        if (token === PRIVATE_AUTH_TOKEN) {
            console.log("Noooo")
            const partnerships = await db.partnership.findMany({
                select: {
                    shop: true,
                    discountId: true,
                    totalSales: true,
                    currSales: true
                }
            });
            if (!partnerships) {
                return json({ message: 'Partnerships not found' }, { status: 404 });
            }
        
            //await db.partnership.updateMany({ where: { shop: "quickstart-9f306b3f.myshopify.com" }, data: { totalSales: 1.0 }});
        //} //extra
    //} //extra
            const updateResponses = []

            updateResponses.push(partnerships.forEach(async function(partnership) {
                if (partnership.discountId != null && partnership.totalSales != null && partnership.currSales != null) {
                    const { admin } = await unauthenticated.admin(partnership.shop);
                    const response = await admin.graphql(
                        `#graphql
                            query queryOrders($searchQuery: String!) {
                                orders(first: 10, query: $searchQuery) {
                                    edges {
                                        node {
                                            discountCodes
                                            netPaymentSet {
                                                shopMoney {
                                                    amount
                                                }
                                            }
                                            createdAt
                                        }
                                    }
                                }
                            }
                        `,
                        {
                            variables: {
                                searchQuery: "(created_at:2023-10-18) AND (discount_code:Adelfi*)",
                            },
                        }
                    );

                    const {
                        data: { orders },
                    } = await response.json();

                    if (orders != null) {
                        let newSales = 0.0;
                        orders?.edges?.forEach((order) => {
                            console.log(order.node.discountCodes)
                            for (const code of order.node.discountCodes) {
                                //if (code.startsWith("Adelfi")) {
                                    newSales = newSales + parseFloat(order.node.netPaymentSet.shopMoney.amount);
                                    break;
                                //}
                            }
                        })
                        console.log("newSales: " + newSales)
                        partnership.totalSales = partnership.totalSales + newSales;
                        partnership.currSales = partnership.currSales + newSales;
                    }
                    try {
                        const updateResponse = await db.partnership.updateMany({ where: { shop: partnership.shop }, data: { ...partnership }})
                        if (updateResponse.count === 0) {
                            return json({ error: "Partnership not updated" }, { status: 400 });
                        } else {
                            return json({ success: "Partnership updated" });
                        }
                    } catch (error) {
                        console.error("Error updating partnerships", error);
                        return json({ error: "Internal server error" }, { status: 500 });
                    }
                } else {
                    return json({ error: "No discountId attached to this shop" })
                }
            }));
            return json({updateResponses: updateResponses})
        } else {
            return json({ error: "Invalid token" }, { status: 401 });
        }
    }
    return json({ message: "API endpoint reached"});
};
  