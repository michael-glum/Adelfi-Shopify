import { json } from "@remix-run/node";
import db from "../db.server"
import { unauthenticated } from "../shopify.server";
import nodemailer from "nodemailer";

const PRIVATE_AUTH_TOKEN = process.env.PRIVATE_AUTH_TOKEN;
const ORDER_GRACE_PERIOD = 6;
const UPDATE_SALES_TASK = "UPDATE_SALES"
const COLLECT_COMMISSIONS_TASK = "COLLECT_COMMISSIONS"

// yighay
export const action = async ({ request }) => {
    if (request.method === "POST") {
        const { token, task } = await request.json();
        if (token === PRIVATE_AUTH_TOKEN) {
            console.log("Noooo")
            const partnerships = await db.partnership.findMany({
                select: {
                    shop: true,
                    discountId: true,
                    commission: true,
                    totalSales: true,
                    currSales: true,
                    lastUpdated: true,
                    lastPayment: true
                }
            });
            if (!partnerships) {
                return json({ message: 'Partnerships not found' }, { status: 404 });
            }

            const updateResponses = []
            const today = getDateXDaysAgo(0);

            updateResponses.push(partnerships.forEach(async function(partnership) {
                if (partnership.lastUpdated != today || task === COLLECT_COMMISSIONS_TASK) {
                    if (partnership.discountId != null && partnership.totalSales != null && partnership.currSales != null) {
                        if (task === UPDATE_SALES_TASK) {
                          const { admin } = await unauthenticated.admin(partnership.shop);
                          const bulkOpResponse = await queryOrdersBulkOperation(admin);
                          console.log("Bulk Operation Response Status: " + JSON.stringify(bulkOpResponse))
                        } else if (task === COLLECT_COMMISSIONS_TASK) {
                          const currSales = parseFloat((Math.floor(partnership.currSales * partnership.commission * 100) / 100).toFixed(2))
                          console.log("currSales for shop: " + partnership.shop + " is " + partnership.currSales);
                          partnership.lastPayment = currSales
                          partnership.currSales = 0;
                          try {
                            const emailResponse = await sendEmail(partnership.shop, currSales)
                            console.log("Email sent successfully:", JSON.stringify(emailResponse));
                          } catch (error) {
                            console.error("Email sending failed:", error);
                          }
                          const updateResponse = await db.partnership.updateMany({ where: { shop: partnership.shop}, data: { ...partnership }})
                          if (updateResponse.count === 0) {
                            console.error("Error: Couldn't update partnership.currSales in db for shop: " + partnership.shop);
                            return null;
                        } else {
                            console.log("Partnership db currSales updated for shop: " + partnership.shop);
                        }
                        }
                    } else {
                        console.log("No discountId attached to this shop: " + partnership.shop)
                    }
                } else {
                  console.log("Commission already calculated today for: " + partnership.shop);
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
    const queryDate = getDateXDaysAgo(ORDER_GRACE_PERIOD);
    const query = `
    {
      orders(query: "created_at:${queryDate} AND discount_code:Adelfi*") {
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
    `
    const response = await admin.graphql(
      `#graphql
        mutation queryOrders($query: String!) {
          bulkOperationRunQuery(
            query: $query
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
          query: query,
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

async function sendEmail(shop, commission) {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "mglum@adelfi.com",
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: "Adelfi Commission Tracker",
      to: "mglum@adelfi.com",
      subject: "Commissions owed by " + shop,
      text: "Shop: " + shop + "\nCommissions Owed: " + commission,
    };

    const info = await transporter.sendMail(mailOptions);

    return json({ message: "Email sent successfully", info });
  } catch (error) {
    console.error("Email sending failed", error);
    return json({ error: "Email sending failed", details: error });
  }
}