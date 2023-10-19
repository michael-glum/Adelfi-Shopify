import { authenticate } from "../shopify.server";
import { json } from "@remix-run/node"

export const loader = async ({ request }) => {
    try {
        // Verify the authenticity of the incoming request.
        // Parse and process the webhook payload.
        const { topic, shop, session } = await authenticate.webhook(request);
        console.log("Webhook from shop: " + shop)
        console.log("Topic: " + topic)
        console.log("Session: " + session)
        // Respond with a success status.
        return json({ success: true });
    } catch (error) {
        console.error('Error processing the webhook:', error);
        // Handle the error and respond accordingly.
        return json({ error: 'Webhook processing failed' }, { status: 400 });
    }
};