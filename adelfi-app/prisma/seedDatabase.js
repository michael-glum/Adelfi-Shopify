const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  try {
    await prisma.partnership.deleteMany()
    await prisma.partnership.create({
      data: {
        id: 'gid://shopify/Shop/83699237168',
        shop: 'quickstart-9f306b3f.myshopify.com',
        title: '25% Off With Adelfi',
        usageLimit: 4,
        percentOff: 0.25,
        commission: 0.1,
        totalSales: 0,
        currSales: 0
      },
    });

    // Add more data as needed

    console.log('Database seeding completed');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();