import { defer } from "@defer/client"
import { json } from "@remix-run/node";

const API_BASE_URL = "https://adelfi.fly.dev/";

async function updateSales() {
    const requestBody = {
        token: process.env.PRIVATE_AUTH_TOKEN
    }
    console.log(requestBody.token);
    const response = await fetch(`${API_BASE_URL}partnership`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
    });

    return response
}

export default defer.cron(updateSales, "42 20 * * *");