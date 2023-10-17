import { useLoaderData } from "@remix-run/react";
import updateSales from "~/defer/updateSales";
import shopify from '../shopify.server';

export const loader = async({request}) => {
    const shop = request
    const { admin, session } = await shopify.unauthenticated.admin(shop);
    await updateSales();
    return new Response("OK.", {
        status: 200,
    });
} 