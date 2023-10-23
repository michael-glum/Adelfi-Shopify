import { authenticate, unauthenticated } from "../shopify.server";
import { json } from "@remix-run/node"
import { Readable } from 'stream'
import { createInterface } from 'readline'
import db from '../db.server'

export async function action ({ request }) {
    //try {
        // Verify the authenticity of the incoming request.
        // Parse and process the webhook payload.
        console.log("Webhook processing...")
        const req = request
        const requestJson = await request.json()
        console.log("Request Body: " + JSON.stringify(requestJson));
        const { topic, shop, session } = await authenticate.webhook(req);
        const { admin } = await unauthenticated.admin(shop);
        console.log("Webhook from shop: " + shop)
        console.log("Topic: " + topic)
        console.log("Session: " + JSON.stringify(session))

        const { admin_graphql_api_id, status, error_code } = requestJson;
        
        console.log("Bulk Operation Status: " + status)
        console.log("Bulk Operation Error Code: " + error_code)
        console.log("Bulk Operation Admin GraphQL API Id: " + admin_graphql_api_id)


        const partnership = await db.partnership.findFirst({ where: { shop: shop },
            select: {
                discountId: true,
                totalSales: true,
                currSales: true
            }
        });

        if (!partnership) {
            console.log("Partnership not found for shop: " + shop);
            return json({ message: 'Partnership not found' }, { status: 404 });
        }

        if (partnership.discountId == null || partnership.totalSales == null || partnership.currSales == null) {
            console.log('Partnership table not properly initiliazed for shop: ' + shop);
            return null;
        }

        const response = await admin.graphql(
            `#graphql
              query getBulkOperationUrl($id: ID!) {
                node(id: $id) {
                  ... on BulkOperation {
                    url
                    partialDataUrl
                  }
                }
              }`,
            {
                variables: {
                    id: admin_graphql_api_id
                }
            }
        );

        const { data } = await response.json()
        const dataUrl = data.node.url;
        const partialDataUrl = data.node.partialDataUrl

        const url = (status == "completed") ? dataUrl : partialDataUrl;
        const jsonDataArray = await downloadJsonData(url);
        if (jsonDataArray != null) {
            let newSales = 0.0;
            for (let i = 0; i < jsonDataArray.length; i++) {
                const responseJson = jsonDataArray[i];
                for (const code of responseJson.discountCodes) {
                    if (code.startsWith("Adelfi")) {
                        newSales = newSales + parseFloat(responseJson.netPaymentSet.shopMoney.amount);
                        break;
                    }
                }
            }
            console.log("New Sales: " + newSales);
            partnership.totalSales = partnership.totalSales + newSales;
            partnership.currSales = partnership.currSales + newSales;
            try {
                const updateResponse = await db.partnership.updateMany({ where: { shop: shop}, data: { ...partnership }})
                if (updateResponse.count === 0) {
                    console.error("Error: Couldn't update partnership in db for shop: " + shop);
                    return null;
                } else {
                    console.log("Partnership db updated for shop: " + shop);
                }
            } catch (error) {
                console.error("Error updating partnerships for shop: " + shop, error);
                return null;
            }
        }

        // Respond with a success status.
        console.log("Successfully processed bulk orders webhook")
        return json({ success: true });
    /*} catch (error) {
        console.error('Error processing the webhook:', error);
        // Handle the error and respond accordingly.
        return json({ error: 'Webhook processing failed' }, { status: 400 });
    }*/
};

async function downloadJsonData(url) {
    const response = await fetch(url);
    if (response.status === 200) {
        const reader = response.body?.getReader();
        const stream = new Readable({
            read() {},
        });

        reader?.read().then(function processResult(result) {
            if (result.done) {
                stream.push(null);
                return;
            }

            const chunk = result.value;

            stream.push(chunk);

            return reader.read().then(processResult);
        });

        const rl = createInterface({
            input: stream,
            crlfDelay: Infinity,
        });

        const jsonDataArray = [];

        for await (const line of rl) {
            try {
                const jsonData = JSON.parse(line);
                jsonDataArray.push(jsonData);
            } catch (error) {
                console.error('Error parsing JSON:', error);
            }
        }

        return jsonDataArray;
    } else {
        console.log('Failed to fetch data. Response: ' + response.status)
        return null
    }
}