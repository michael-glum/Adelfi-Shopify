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

            const updateResponses = []

            updateResponses.push(partnerships.forEach(async function(partnership) {
                if (partnership.discountId != null && partnership.totalSales != null && partnership.currSales != null) {
                    const { admin } = await unauthenticated.admin(partnership.shop);
                    const bulkOpResponse = await queryOrdersBulkOperation(admin);
                    console.log("Bulk Operation Response Status: " + bulkOpResponse)
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


async function queryOrdersBulkOperation(admin) {
    const searchQuery = "(created_at:2023-10-18) AND (discount_code:Adelfi*)"
    const response = await admin.graphql(
      `#graphql
        mutation bulkOperationRunQuery($query: String!) {
          bulkOperationRunQuery(query: $query) {
            bulkOperation {
              id
              status
            }
            userErrors {
              field
              message
            }
          }
        }`,
      {
        variables: {
            query: `{
              orders(query: ${searchQuery}) {
                edges {
                  node {
                    discountCodes
                    netPaymentSet {
                      shopMoney {
                        amount
                      }
                    }
                  }
                }
              }
            }`
        }
      }
    ); 
    const { data } = await response.json()
    const status = await data.bulkOperationRunQuery.bulkOperation.status;
    console.log("Bulk operation status: " + status);
    return status;
}