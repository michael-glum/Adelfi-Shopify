import db from "../db.server";

export async function getPartnership(shop, graphql) {
    const partnership = await db.partnership.findFirst({ where: { shop: shop } });

    if (!partnership) {
        return null
    }

    return partnership
    //return (partnership.discountId == null) ? partnership : supplementPartnership(partnership, graphql);
}

async function supplementPartnership(partnership, graphql) {

  const response = await graphql(
    `#graphql
      query {
        discountNode($id: partnership.discountId!) {
          id
          discount {
            ... on DiscountCodeBasic {
              asyncUsageCount
            }
          }
        }
      }
    `
  );

  const {
    data: { discountNode },
  } = await response.json();

  partnership.uses = !discountNode?.discount.DiscountCodeBasic.asyncUsageCount

  return {
    partnership
  };
}
  