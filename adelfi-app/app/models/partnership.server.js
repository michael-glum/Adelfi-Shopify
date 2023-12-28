import db from "../db.server";

export async function getPartnership(shop, graphql) {
    const partnership = await db.partnership.findFirst({ where: { shop: shop } });

    if (!partnership || !partnership.isActive) {
        return null
    }
    
    if (!partnership.isInstalled) {
      await db.partnership.updateMany({ where: { shop: shop }, data: { isInstalled: true } });
      partnership.isInstalled = true;
    }

    return (partnership.discountId == null) ? partnership : await supplementPartnership(partnership, graphql, shop);
}

async function supplementPartnership(partnership, graphql, shop) {
  
  const response = await graphql(
    `#graphql
      query supplementPartnership($id: ID!) {
        codeDiscountNode(id: $id) {
          id
        }
      }
    `,
    {
      variables: {
        id: partnership.discountId,
      },
    }
  );

  const {
    data: { codeDiscountNode },
  } = await response.json();


  if (codeDiscountNode == null) {
    partnership.discountId = null;
    partnership.codes = null;
    await db.partnership.updateMany({ where: { shop: shop }, data: { ...partnership }})
  }

  return partnership;
  
}
  