import { authenticate } from "../shopify.server";
import db from "../db.server";

export const action = async ({ request }) => {
  console.log("Webhook endpoint reached")
  const { topic, shop, session } = await authenticate.webhook(request);

  switch (topic) {
    case "APP_UNINSTALLED":
      if (session) {
        await db.session.deleteMany({ where: { shop } });
      }
      break;
    case "CUSTOMERS_DATA_REQUEST":
    case "CUSTOMERS_REDACT":
    case "SHOP_REDACT":
    case "BULK_OPERATIONS_FINISH":
      console.log("Bulk Operations Finished")
    default:
      console.log("Unhandled webhook topic")
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  throw new Response();
};
