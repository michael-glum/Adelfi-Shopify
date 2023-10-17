import { useLoaderData } from "@remix-run/react";
import updateSales from "~/defer/updateSales";
import shopify from '../shopify.server';

export const loader = async({request}) => {
    const responseText = await updateSales();
    return new Response(responseText.id, {
        status: 200,
    });
} 