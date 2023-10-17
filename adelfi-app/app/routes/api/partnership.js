import { json } from "@remix-run/node";
import db from "../../db.server"

const PRIVATE_AUTH_TOKEN = process.env.PRIVATE_AUTH_TOKEN;

export const loader = async ({ request }) => {

    if (request.method === "GET") {
        const authHeader = request.headers.get("Authorization");
        if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            if (token === PRIVATE_AUTH_TOKEN) {
                // Provide relevant partnership data
                const data = await db.partnership.findMany({
                    select: {
                        shop: true,
                        discountId: true,
                        totalSales: true,
                        currSales: true
                    }
                });
                if (!data) {
                    return json({ message: 'Data not found' }, { status: 404 });
                }
                return json(data);
            } else {
                return json({ error: "Invalid token" }, { status: 401 });
            }
        }
    } else if (request.method === "POST") {
        const { token } = request.locals;
        if (token === PRIVATE_AUTH_TOKEN) {
            // Update database sales records
            const { data } = await request.json();
            try {
                const updatedPartnerships = await db.partnership.updateMany({ where: { shop: data.shop }, data: { ...data }})
                if (updatedPartnerships.count === 0) {
                    return json({ error: "No partnerships were updated" }, { status: 400 });
                } else {
                    return json({ success: "Partnerships updated" });
                }
            } catch (error) {
                console.error("Error updating partnerships", error);
                return json({ error: "Internal server error" }, { status: 500 });
            }
        } else {
            return json({ error: "Invalid token" }, { status: 401 });
        }
    }
    return json({ message: "Request is valid. API endpoint reached"});
  };
  