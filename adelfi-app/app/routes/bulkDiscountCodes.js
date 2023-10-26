// Utility functions for generating bulk discount codes

const CODE_PREFIX = "Adelfi-"
const CODE_LENGTH = 9
export const NUM_CODES = 1000

export async function createDiscount(admin, myCode, partnership) {
    const response = await admin.graphql(
      `#graphql
        mutation discountCodeBasicCreate($basicCodeDiscount: DiscountCodeBasicInput!) {
          discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
            codeDiscountNode {
              id
              codeDiscount {
                ... on DiscountCodeBasic {
                  title
                  codes(first: 10) {
                    nodes {
                      code
                    }
                  }
                  usageLimit
                  startsAt
                  endsAt
                  customerSelection {
                    ... on DiscountCustomerAll {
                      allCustomers
                    }
                  }
                  customerGets {
                    value {
                      ... on DiscountPercentage {
                        percentage
                      }
                    }
                    items {
                      ... on AllDiscountItems {
                        allItems
                      }
                    }
                  }
                  appliesOncePerCustomer
                }
              }
            }
            userErrors {
              field
              code
              message
            }
          }
        }`,
      {
        variables: {
          "basicCodeDiscount": {
            "title": partnership.title,
            "code": myCode,
            "startsAt": (new Date()).toISOString(),
            "endsAt": partnership.expires,
            "customerSelection": {
              "all": true
            },
            "customerGets": {
              "value": {
                "percentage": partnership.percentOff
              },
              "items": {
                "all": true
              }
            },
            "appliesOncePerCustomer": false,
            "usageLimit": partnership.usageLimit
          }
        },
      }
    );
  
    const responseJson = await response.json();
  
    return responseJson;
  }

export async function generateBulkDiscountCodes(admin, codeSets, discountId) {
    const responses = []
  
    while (responses.length < codeSets.length) {
      const codes = codeSets[responses.length]
  
      const response = await admin.graphql(
        `#graphql
          mutation discountRedeemCodeBulkAdd($discountId: ID!, $codes: [DiscountRedeemCodeInput!]!) {
            discountRedeemCodeBulkAdd(discountId: $discountId, codes: $codes) {
              bulkCreation {
                id
              }
              userErrors {
                code
                field
                message
              }
            }
          }`,
        {
          variables: {
            "discountId": discountId,
            "codes": codes
          },
        }
      ); 
      const responseJson = await response.json()
      if (responseJson.data.discountRedeemCodeBulkAdd.bulkCreation != null) {
        responses.push(responseJson)
      }
    }
  
    return responses
}

export function generateCodes(codesArray) {

    const setCount = Math.ceil(codesArray.length / 100)
    const codeSets = [];
  
    for (let i = 0; i < setCount - 1; i++) {
      const startIndex = i * 100;
      const endIndex = (i + 1) * 100;
      const codeSet = codesArray.slice(startIndex, endIndex)
      codeSets.push(codeSet)
    }
  
    const lastIndex = setCount - 1;
    const lastSet = codesArray.slice(lastIndex * 100);
    codeSets.push(lastSet);
  
    return codeSets;
}

export function generateCodesArray(existingCodesArray) {
    if (existingCodesArray === undefined) {
        const codes = new Set()
  
        while (codes.size < NUM_CODES) {
          codes.add({code: CODE_PREFIX + makeCode(CODE_LENGTH)})
        }
      
        return Array.from(codes)
    } else {
        const codes = new Set(existingCodesArray);

        const uniqueCodes = [];

        while (uniqueCodes.length < NUM_CODES) {
            const newCode = CODE_PREFIX + makeCode(CODE_LENGTH);
            if (!codes.has(newCode)) {
                uniqueCodes.push(newCode);
                codes.add(newCode);
            }
        }

        return uniqueCodes;
    }
}

function makeCode(length) {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
}

export async function deleteBulkDiscountCodes(admin, discountId) {
    const response = await admin.graphql(
        `#graphql
          mutation discountCodeBulkDelete($ids: [ID!]) {
            discountCodeBulkDelete(ids: $ids) {
              job {
                id
              }
              userErrors {
                field
                message
              }
            }
          }`,
        {
          variables: {
            "ids" : [
                "" + discountId
            ]
          },
        }
      ); 

    const responseJson = await response.json()
  
    return JSON.stringify(responseJson);
}