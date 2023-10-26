import { json } from "@remix-run/node";
import sendEmail from './sendEmail.server';

export const action = async ({ request }) => {
  if (request.method === 'POST') {
    // Get data from the client
    const { shop, content, hasAttachment } = await request.json();

    // Call email sending function
    const emailResult = await sendEmail(shop, content, hasAttachment);

    // Return a JSON response to the client
    return json(emailResult);
  } else {
    // Handle other HTTP methods if needed
    return new Response('Method Not Allowed', { status: 405 });
  }
};