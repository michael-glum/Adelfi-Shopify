import { useLoaderData } from "@remix-run/react";
import updateSales from "~/defer/updateSales"

export const loader = async({request}) => {
    await updateSales();
    return new Response("OK.", {
        status: 200,
    });
} 