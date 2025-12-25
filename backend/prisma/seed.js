const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient() 

async function main() {
  await prisma.stock.createMany({
    data: [
      { symbol: "TCS", price: 3200, basePrice: 3200 },
      { symbol: "RELIANCE", price: 2800, basePrice: 2800 },
      { symbol: "INFY", price: 1500, basePrice: 1500 },
      { symbol: "HDFC", price: 1650, basePrice: 1650 }
    ]
  });

  console.log("Stocks seeded 🎉");
}

main()
  .then(() => prisma.$disconnect())
  .catch(e => {
    console.error(e);
    prisma.$disconnect();
  });
