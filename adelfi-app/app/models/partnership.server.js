import db from "../db.server";

export async function getPartnership(shop, graphql) {
    const partnership = await db.partnership.findFirst({ where: { shop: shop } });

    if (!partnership) {
        return null
    }

    return (partnership.discountId == null) ? partnership : supplementPartnership(partnership, graphql, shop);
}

async function supplementPartnership(partnership, graphql, shop) {
  
  const response = await graphql(
    `#graphql
      query supplementPartnership($id: ID!) {
        codeDiscountNode(id: $id) {
          id
          codeDiscount {
            ... on DiscountCodeBasic {
              totalSales {
                amount
                currencyCode
              }
            }
          }
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
  } else {
    partnership.totalSales = codeDiscountNode?.codeDiscount?.DiscountCodeBasic?.totalSales?.amount
    partnership.currency = codeDiscountNode?.codeDiscount?.DiscountCodeBasic?.totalSales?.currencyCode
  }

  await db.partnership.updateMany({ where: { shop: shop }, data: { ...partnership }})

  return partnership;
  
}
  