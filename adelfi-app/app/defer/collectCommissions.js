import { defer } from "@defer/client"
import { json } from "@remix-run/node";

const API_BASE_URL = "https://adelfi.fly.dev/";
const COLLECT_COMMISSIONS_TASK = "COLLECT_COMMISSIONS"

async function collectCommissions() {
    const requestBody = {
        token: process.env.PRIVATE_AUTH_TOKEN,
        task: COLLECT_COMMISSIONS_TASK
    }
    console.log(requestBody.token);
    const response = await fetch(`${API_BASE_URL}partnershipUpdates`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody)
    });

    return response
}

export default defer.cron(collectCommissions, "10 24 * * *");//"0 0 1 * *");