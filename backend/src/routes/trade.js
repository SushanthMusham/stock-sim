const express = require("express");
const router = express.Router();
const prisma = require("../prisma");



router.get("/user/:id", async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id }
  });

  if (!user) return res.status(404).json({ message: "User not found" });

  res.json(user);
});


router.get("/portfolio/:userId", async (req, res) => {
  const portfolio = await prisma.portfolio.findMany({
    where: { userId: req.params.userId },
    include: {
      stock: true
    }
  });

  res.json(portfolio);
});



// BUY API
router.post("/buy", async (req, res) => {
  try {
    const { userId, stockSymbol, quantity } = req.body;

    // Basic Validation
    if (!userId || !stockSymbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid inputs" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Get Stock
    const stock = await prisma.stock.findUnique({
      where: { symbol: stockSymbol }
    });

    if (!stock) {
      return res.status(404).json({ message: "Stock not found" });
    }

    const totalCost = stock.price * quantity;

    // Wallet Check
    if (user.balance < totalCost) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    // RUN TRANSACTION (SUPER IMPORTANT)
    const result = await prisma.$transaction(async (tx) => {
      
      // Deduct Balance
      const updatedUser = await tx.user.update({
        where: { id: userId },
        data: {
          balance: user.balance - totalCost
        }
      });

      // Update Portfolio (UPSERT)
      const portfolio = await tx.portfolio.upsert({
        where: {
          userId_stockId: {
            userId: userId,
            stockId: stock.id
          }
        },
        update: {
          quantity: { increment: quantity }
        },
        create: {
          userId: userId,
          stockId: stock.id,
          quantity: quantity
        }
      });

      // Transaction Log
      await tx.transaction.create({
        data: {
          userId: userId,
          stockId: stock.id,
          quantity,
          price: stock.price,
          type: "BUY"
        }
      });

      return { updatedUser, portfolio };
    });

    return res.json({
      message: "Stock Purchased Successfully 🎉",
      wallet: result.updatedUser.balance,
      portfolio: result.portfolio
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Buy Failed", error: err.message });
  }
});


router.post("/sell", async (req, res) => {
  try {
    const { userId, stockSymbol, quantity } = req.body;

    if (!userId || !stockSymbol || !quantity || quantity <= 0) {
      return res.status(400).json({ message: "Invalid inputs" });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) return res.status(404).json({ message: "User not found" });

    // Get stock
    const stock = await prisma.stock.findUnique({
      where: { symbol: stockSymbol }
    });

    if (!stock) return res.status(404).json({ message: "Stock not found" });

    // Get Portfolio Entry
    const portfolio = await prisma.portfolio.findUnique({
      where: {
        userId_stockId: {
          userId,
          stockId: stock.id
        }
      }
    });

    if (!portfolio) {
      return res.status(400).json({ message: "You do not own this stock" });
    }

    // Check Quantity
    if (portfolio.quantity < quantity) {
      return res.status(400).json({ message: "Not enough quantity to sell" });
    }

    const totalGain = stock.price * quantity;

    // Transaction Block
    await prisma.$transaction(async (tx) => {

      // Update Wallet
      await tx.user.update({
        where: { id: userId },
        data: {
          balance: user.balance + totalGain
        }
      });

      // If selling all → delete portfolio entry
      if (portfolio.quantity === quantity) {
        await tx.portfolio.delete({
          where: { id: portfolio.id }
        });
      } 
      else {
        // Otherwise decrease quantity
        await tx.portfolio.update({
          where: { id: portfolio.id },
          data: {
            quantity: portfolio.quantity - quantity
          }
        });
      }

      // Log transaction
      await tx.transaction.create({
        data: {
          userId,
          stockId: stock.id,
          quantity,
          price: stock.price,
          type: "SELL"
        }
      });
    });

    res.json({
      message: "Stock Sold Successfully 🎯",
      gained: totalGain
    });

  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "Sell Failed", error: err.message });
  }
});



module.exports = router;
