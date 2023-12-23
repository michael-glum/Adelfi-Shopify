import { json } from "@remix-run/node"
import db from '../db.server'

export async function action ({ request }) {
    const data = await request.json();
    try {
        const result = await writeToPrimaryDatabase(data);
        return json(result, { status: 200 });
      } catch (error) {
        console.error('Error handling request:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
      }
}

async function writeToPrimaryDatabase(data) {
    try {
      // Logic to interact with the primary database (e.g., Prisma, database client, etc.)
      // Replace this with actual database write logic
  
      console.log('Write to primary database:', data);
      // Simulate a successful database write for demonstration purposes
      return { status: 'success' };
    } catch (error) {
      console.error('Error writing to primary database:', error);
      throw error;
    }
}