import { defer } from "@defer/client"
import { json } from "@remix-run/node";

const API_BASE_URL = "https://adelfi.fly.dev/api";

async function updateSales() {
    const requestBody = {
        token: `${process.env.PRIVATE_AUTH_TOKEN}`
    }

    const response = await fetch(`${API_BASE_URL}/partnership`, {
        method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody)
    });

    const { updateResponses } = await response.json()

    return json ({ updateResponses })
}

export default defer(updateSales);