import { json } from "@remix-run/node";
import db from "../db.server"
import { unauthenticated } from "../shopify.server";
//import nodemailer from "nodemailer";
import sendEmail from "./sendEmail.server";
import {
  createDiscount,
  generateBulkDiscountCodes,
  generateCodesArray,
  generateCodes,
  deleteBulkDiscountCodes,
} from "./bulkDiscountCodes";

const { startOfMonth } = require('date-fns');

const PRIVATE_AUTH_TOKEN = process.env.PRIVATE_AUTH_TOKEN;
//const EMAIL_PASS = process.env.EMAIL_PASS;
const ORDER_GRACE_PERIOD = 9;
const UPDATE_SALES_TASK = "UPDATE_SALES"
const COLLECT_COMMISSIONS_TASK = "COLLECT_COMMISSIONS"

// yighay
export const action = async ({ request }) => {
    if (request.method === "POST") {
        const { token, task } = await request.json();
        if (token === PRIVATE_AUTH_TOKEN) {
            console.log("Noooo")
            const partnerships = await db.partnership.findMany();
            if (!partnerships) {
                return json({ message: 'Partnerships not found' }, { status: 404 });
            }

            const updateResponses = []
            const today = await getDateXDaysAgo(0);

            updateResponses.push(partnerships.forEach(async function(partnership) {
                if (partnership.lastUpdated != today || task === COLLECT_COMMISSIONS_TASK) {
                    const { admin } = await unauthenticated.admin(partnership.shop);
                    // If the partnership isn't active, make sure the discount codes are deleted, and no additional processing is done
                    if (partnership.isActive === false) {
                        if (partnership.discountId != null) {
                            const response = deleteBulkDiscountCodes(admin, partnership.discountId)
                            console.log("Delete codes response: " + response)
                            partnership.discountId = null;
                            partnership.codes = null;
                            const updateResponse = await db.partnership.updateMany({ where: { shop: partnership.shop}, data: { ...partnership }})
                            if (updateResponse.count === 0) {
                                console.error("Error: Couldn't update partnership.currSales in db for shop: " + partnership.shop);
                                return null;
                            } else {
                                console.log("Partnership db currSales updated for shop: " + partnership.shop);
                            }
                        }
                        return null;
                    }
                    if (partnership.discountId != null && partnership.totalSales != null && partnership.currSales != null) {
                        if (task === UPDATE_SALES_TASK) {
                          const bulkOpResponse = await queryOrdersBulkOperation(admin);
                          console.log("Bulk Operation Response Status: " + JSON.stringify(bulkOpResponse))
                        } else if (task === COLLECT_COMMISSIONS_TASK) {
                          await collectCommissions(partnership, admin);
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
    const queryDate = await getDateXDaysAgo(ORDER_GRACE_PERIOD);
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

async function getDateXDaysAgo(x) {
  var t = new Date();
  t.setDate(t.getDate() - x)
  const date = ('0' + t.getDate()).slice(-2);
  const month = ('0' + (t.getMonth() + 1)).slice(-2);
  const year = t.getFullYear();
  console.log("Date " + x + " days ago: " + `${year}-${month}-${date}`)
  return `${year}-${month}-${date}`;
}

/*async function sendEmail(shop, commission) {
  try {
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: "mglum@adelfi.shop",
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: "mglum@adelfi.shop",
      to: "mglum@adelfi.shop",
      subject: "Commissions owed by " + shop,
      text: "Shop: " + shop + "\nCommissions Owed: $" + commission + "\n\n(Automatic Commission Tracker)",
    };

    const info = await transporter.sendMail(mailOptions);

    return json({ message: "Email sent successfully", info });
  } catch (error) {
    console.error("Email sending failed", error);
    return json({ error: "Email sending failed", details: error });
  }
}*/

async function collectCommissions(partnership, admin) {
  const currSales = parseFloat((Math.floor(partnership.currSales * partnership.commission * 100) / 100).toFixed(2))
  console.log("currSales for shop: " + partnership.shop + " is " + currSales);
  partnership.lastPayment = currSales
  partnership.currSales = 0;
  const emailResponse = await sendEmail(partnership.shop.split(".")[0], currSales, false)
  console.log("Email response:", JSON.stringify(emailResponse));

  if (true) {//((new Date()).getMonth() === partnership.expires.getMonth()) {
    if (partnership.autoRenew === true) {
      // Generate new codes
      const codesArray = generateCodesArray();

      // Delete old codes
      await deleteBulkDiscountCodes(admin, partnership.discountId);
      partnership.discountId = null;
      partnership.codes = null;

      // Convert the updated array back to a buffer
      const updatedCodesBuffer = Buffer.from(JSON.stringify(codesArray), "utf-8");

      // Assign the updated data back to partnership.codes
      partnership.codes = updatedCodesBuffer;

      // Grab array to be emailed before popping the first code
      const emailCodesArray = [...codesArray];

      // Get the first code to make the initial discount with
      const firstCode = codesArray.pop()
      console.log("First code " + firstCode);

      // Partition sets of codes
      const codeSets = generateCodes(codesArray)

      // Set new expiration date for two months from now
      const expiresDate = new Date(partnership.expires);

      expiresDate.setMonth(expiresDate.getMonth() + 2);

      partnership.expires = startOfMonth(expiresDate);

      // Generate original discount
      const discountJson = await createDiscount(admin, firstCode.code, partnership);

      // Get new discountId
      const discountId = await discountJson.data.discountCodeBasicCreate.codeDiscountNode.id

      // Store new discountId
      partnership.discountId = discountId
      console.log("New codes generating for expiration date: " + partnership.expires);

      // Generate bulk discounts codes for the new discount identified by discountId
      generateBulkDiscountCodes(admin, codeSets, discountId);

      sendEmail(partnership.shop.split(".")[0], emailCodesArray, true);
    } else {
      partnership.isActive = false;
      const response = deleteBulkDiscountCodes(admin, partnership.discountId)
      console.log("Delete codes response: " + response)
      partnership.discountId = null;
      partnership.codes = null;
    }
  }

  const updateResponse = await db.partnership.updateMany({ where: { shop: partnership.shop}, data: { ...partnership }})
  if (updateResponse.count === 0) {
    console.error("Error: Couldn't update partnership.currSales in db for shop: " + partnership.shop);
    return null;
  } else {
    console.log("Partnership db currSales updated for shop: " + partnership.shop);
  }
}