import { json } from "@remix-run/node";
import db from "../db.server"
import { unauthenticated } from "../shopify.server";

const PRIVATE_AUTH_TOKEN = process.env.PRIVATE_AUTH_TOKEN;
const ORDER_GRACE_PERIOD = 30;

// yighay
export const action = async ({ request }) => {
    if (request.method === "POST") {
        const { token } = await request.json();
        if (token === PRIVATE_AUTH_TOKEN) {
            console.log("Noooo")
            const partnerships = await db.partnership.findMany({
                select: {
                    shop: true,
                    discountId: true,
                    totalSales: true,
                    currSales: true,
                    lastUpdated: true
                }
            });
            if (!partnerships) {
                return json({ message: 'Partnerships not found' }, { status: 404 });
            }

            const updateResponses = []
            const today = getDateXDaysAgo(0);

            updateResponses.push(partnerships.forEach(async function(partnership) {
                //if (partnership.lastUpdated != today) {
                    if (partnership.discountId != null && partnership.totalSales != null && partnership.currSales != null) {
                        const { admin } = await unauthenticated.admin(partnership.shop);
                        const bulkOpResponse = await queryOrdersBulkOperation(admin);
                        console.log("Bulk Operation Response Status: " + JSON.stringify(bulkOpResponse))
                    } else {
                        console.log("No discountId attached to this shop: " + partnership.shop)
                    }
                //} else {
                  //console.log("Commission already calculated today for: " + partnership.shop);
                //}
            }));
            return json({updateResponses: updateResponses})
        } else {
            return json({ error: "Invalid token" }, { status: 401 });
        }
    }
    return json({ message: "API endpoint reached"});
};


async function queryOrdersBulkOperation(admin) {
    const queryDate = getDateXDaysAgo(ORDER_GRACE_PERIOD);
    const response = await admin.graphql(
      `#graphql
        mutation queryOrders($queryDate: String!) {
          bulkOperationRunQuery(
            query: """
            {
              orders(query: "created_at:" $queryDate " AND discount_code:Adelfi*") {
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
            }
            """
          ) {
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
          queryDate: queryDate,
        }
      }
    ); 
    const responseJson = await response.json()
    return responseJson
}

function getDateXDaysAgo(x) {
  var t = new Date();
  t.setDate(t.getDate() - x)
  const date = ('0' + t.getDate()).slice(-2);
  const month = ('0' + (t.getMonth() + 1)).slice(-2);
  const year = t.getFullYear();
  console.log("Date " + x + " days ago: " + `${year}-${month}-${date}`)
  return `${year}-${month}-${date}`;
}