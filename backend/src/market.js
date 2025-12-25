let stocks = [
  { symbol: "TCS", price: 3200 },
  { symbol: "RELIANCE", price: 2800 },
  { symbol: "INFY", price: 1500 },
];

module.exports = function marketEngine(io) {
  setInterval(() => {
    // Simulate stock price changes
    stocks = stocks.map((stock) => {
      const change = (Math.random() - 0.5) * 10; // Random change between -5 and +5
      return {
        ...stock,
        price: Math.max(10, stock.price + change),
      };
    });

    io.emit("stockPrices", stocks);
  }, 1000); // Update every 1 second
};
