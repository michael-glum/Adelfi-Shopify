import updateSales from "~/defer/updateSales";

export const loader = async() => {
    const responseText = await updateSales();
    return new Response(responseText.id, {
        status: 200,
    });
} 