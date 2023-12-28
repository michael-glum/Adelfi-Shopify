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
      if (shop) {
        await db.partnership.updateMany({ where: { shop: shop }, data: { isInstalled: false } })
      }
      throw new Response("Session deleted", { status: 200 });
    case "CUSTOMERS_DATA_REQUEST":
      throw new Response("Data not found", { status: 200 });
    case "CUSTOMERS_REDACT":
      throw new Response("Data not found", { status: 200 });
    case "SHOP_REDACT":
      if (shop) {
        await db.partnership.deleteMany({ where: { shop } });
      }
      throw new Response("Store data erased", { status: 200 });
    default:
      console.log("Unhandled webhook topic")
      throw new Response("Unhandled webhook topic", { status: 404 });
  }

  //throw new Response();
};
