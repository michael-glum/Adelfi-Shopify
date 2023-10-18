import { json } from "@remix-run/node";
import db from "../../db.server"
import { unauthenticated } from "../../shopify.server";

const PRIVATE_AUTH_TOKEN = process.env.PRIVATE_AUTH_TOKEN;

export const loader = async ({ request }) => {
    if (request.method === "POST") {
        const { token } = request.locals;
        if (token === PRIVATE_AUTH_TOKEN) {
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
        } //extra
    } //extra
    //         const updateResponses = []

    //         updateResponses.push(partnerships.forEach(async function(partnership) {
    //             if (partnership.discountId != null && partnership.totalSales != null && partnership.currSales != null) {
    //                 const { admin } = await unauthenticated.admin(partnership.shop);
    //                 const response = await admin.graphql(
    //                     `#graphql
    //                     query queryOrders($id: ID!) {
    //                         orders(query: "created_at:2023-10-16") {
    //                             edges {
    //                                 node {
    //                                     discountCodes
    //                                     netPaymentSet
    //                                     createdAt
    //                                 }
    //                             }
    //                         }
    //                     }
    //                     `,
    //                     {
    //                         variables: {
    //                         },
    //                     }
    //                 );

    //                 const {
    //                     data: { orders },
    //                 } = await response.json();

    //                 if (orders != null) {
    //                     let newSales = 0;
    //                     newSales += orders?.edges?.forEach(function(order) {
    //                         let sales = 0;
    //                         for (const code of order.node.discountCodes) {
    //                             if (code.startsWith("Adelfi")) {
    //                                 sales = order.node.netPaymentSet.shopMoney.decimal;
    //                                 break;
    //                             }
    //                         }
    //                         return sales;
    //                     })
    //                     partnership.totalSales += newSales;
    //                     partnership.currSales += newSales;
    //                 }
    //                 try {
    //                     const updateResponse = await db.partnership.updateMany({ where: { shop: partnership.shop }, data: { ...partnership }})
    //                     if (updateResponse.count === 0) {
    //                         return json({ error: "Partnership not updated" }, { status: 400 });
    //                     } else {
    //                         return json({ success: "Partnership updated" });
    //                     }
    //                 } catch (error) {
    //                     console.error("Error updating partnerships", error);
    //                     return json({ error: "Internal server error" }, { status: 500 });
    //                 }
    //             } else {
    //                 return json({ error: "No discountId attached to this shop" })
    //             }
    //         }));
    //         return json({updateResponses: updateResponses})
    //     } else {
    //         return json({ error: "Invalid token" }, { status: 401 });
    //     }
    // }
    return json({ message: "API endpoint reached"});
};
  