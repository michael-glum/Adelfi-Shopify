import { json } from "@remix-run/node"
import { Form, useLoaderData, useActionData } from "@remix-run/react";

export const loader = () => {
    return json({message: 'hello world'})
}

export const action = async ({ request }) => {
    const body = await request.formData();
    console.log(body.get('first_name'))
    return Object.fromEntries(body.entries());
}

export default function Data() {
    const loaderData = useLoaderData();
    const actionData = useActionData();

    return (
        <div>
            <Form method="POST">
                <input name=""/>
                <button>Submit</button>
            </Form>
            <div>
                Name:{" "}
                {actionData ? `${actionData.first_name} ${actionData.last_name}` : null}
            </div>
        </div>
    );
}