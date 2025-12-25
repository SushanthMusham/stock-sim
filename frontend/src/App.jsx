import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import { TrendingUp, Wallet, Briefcase, Zap, Activity, ArrowRight, CheckCircle, X } from "lucide-react";

const socket = io("https://stock-sim-cc1r.onrender.com");

function App() {
  const USER_ID = "1"; 

  // --- STATE MANAGEMENT ---
  const [wallet, setWallet] = useState(0);
  const [portfolio, setPortfolio] = useState([]);
  const [stocks, setStocks] = useState([]);
  
  // Buy State
  const [symbol, setSymbol] = useState("");
  const [quantity, setQuantity] = useState(0);

  // Sell State
  const [sellStock, setSellStock] = useState(null);
  const [sellQuantity, setSellQuantity] = useState(1);

  // Notification State
  const [orderNotification, setOrderNotification] = useState(null);

  // --- INITIAL DATA FETCH ---
  useEffect(() => {
    fetchWallet();
    fetchPortfolio();

    socket.on("stockPrices", (data) => {
      setStocks(data);
    });
    return () => {
      socket.off("stockPrices");
    };
  }, []);

  async function fetchWallet() {
    try {
      const res = await axios.get(`http://localhost:5000/api/user/${USER_ID}`);
      setWallet(res.data.balance);
    } catch (err) { console.error("Error fetching wallet", err); }
  }

  async function fetchPortfolio() {
    try {
      const res = await axios.get(`http://localhost:5000/api/portfolio/${USER_ID}`);
      setPortfolio(res.data);
    } catch (err) { console.error("Error fetching portfolio", err); }
  }

  // --- BUY LOGIC ---
  async function handleBuy(e) {
    e.preventDefault();
    
    const targetStock = stocks.find(s => s.symbol === symbol.toUpperCase());
    const currentPrice = targetStock ? targetStock.price : 0;
    const totalCost = currentPrice * Number(quantity);

    if (!targetStock) return alert("Invalid Stock Symbol");
    if (wallet < totalCost) return alert("Insufficient Funds!");
    if (quantity <= 0) return alert("Enter valid quantity");

    // Optimistic Update
    setWallet(prev => prev - totalCost);
    setOrderNotification({
      symbol: symbol.toUpperCase(),
      quantity: Number(quantity),
      price: currentPrice,
      total: totalCost,
      success: true,
      type: "BUY" 
    });
    setSymbol("");
    setQuantity(0);

    try {
      await axios.post("http://localhost:5000/api/buy", {
        userId: USER_ID,
        stockSymbol: symbol.toUpperCase(),
        quantity: Number(quantity),
      });
      fetchWallet(); 
      fetchPortfolio();
    } catch (err) { 
      setWallet(prev => prev + totalCost); // Rollback
      alert("Buy failed!"); 
    }
  }

  // --- SELL LOGIC ---
  async function handleSell(e) {
    e.preventDefault();
    if (!sellStock) return;

    if (sellQuantity <= 0 || sellQuantity > sellStock.quantity) {
      alert("Invalid Quantity");
      return;
    }

    const currentPrice = sellStock.stock.price;
    const totalGain = currentPrice * sellQuantity;

    // Optimistic Update
    setSellStock(null); 
    setWallet(prev => prev + totalGain); 
    
    setOrderNotification({
      symbol: sellStock.stock.symbol,
      quantity: sellQuantity,
      price: currentPrice,
      total: totalGain,
      success: true,
      type: "SELL"
    });

    try {
      await axios.post("http://localhost:5000/api/sell", {
        userId: USER_ID,
        stockSymbol: sellStock.stock.symbol,
        quantity: Number(sellQuantity)
      });
      fetchWallet();
      fetchPortfolio();
      setSellQuantity(1);
    } catch (err) {
      setWallet(prev => prev - totalGain); // Rollback
      alert("Sell Failed");
    }
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black text-slate-300 font-sans selection:bg-cyan-500/30">
      
      <div className="max-w-7xl mx-auto p-6 lg:p-10 relative">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6">
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-lg blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <h1 className="relative text-4xl font-bold flex items-center gap-3 text-white">
              <Activity className="text-cyan-400 animate-pulse" size={36} /> 
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                StockSim
              </span>
              <span className="text-xs font-mono py-1 px-2 rounded border border-white/10 bg-white/5 text-cyan-400 uppercase tracking-widest">
                Pro
              </span>
            </h1>
          </div>

          <div className="relative group w-full md:w-auto">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500 to-cyan-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition"></div>
            <div className="relative flex items-center gap-5 bg-black/40 backdrop-blur-xl px-8 py-4 rounded-xl border border-white/10 shadow-2xl">
              <div className="p-3 bg-emerald-500/10 rounded-full">
                <Wallet className="text-emerald-400" size={24} />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Available Balance</p>
                <p className="text-2xl font-mono font-bold text-white">₹{wallet.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </header>

        {/* MAIN GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* MARKET TABLE */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-1 border border-white/10 shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <TrendingUp className="text-cyan-400" size={20}/> Live Market
                </h2>
                <div className="flex gap-2">
                  <span className="h-3 w-3 rounded-full bg-red-500/20 border border-red-500/50"></span>
                  <span className="h-3 w-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></span>
                  <span className="h-3 w-3 rounded-full bg-green-500/20 border border-green-500/50 animate-pulse"></span>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-white/5">
                      <th className="py-4 pl-8 font-medium">Symbol</th>
                      <th className="py-4 font-medium">Price</th>
                      <th className="py-4 pr-8 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-sm">
                    {stocks.map((stock) => (
                      <tr key={stock.symbol} className="group hover:bg-white/[0.02] transition-colors duration-300">
                        <td className="py-5 pl-8 font-bold text-white text-lg tracking-wide group-hover:text-cyan-300 transition-colors">
                          {stock.symbol}
                        </td>
                        <td className="py-5 font-mono text-emerald-400 text-lg shadow-emerald-500/50">
                          ₹{stock.price.toFixed(2)}
                        </td>
                        <td className="py-5 pr-8 text-right">
                          <button 
                            onClick={() => setSymbol(stock.symbol)}
                            className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 px-4 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all hover:shadow-[0_0_15px_rgba(34,211,238,0.3)] active:scale-95"
                          >
                            Trade
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* BUY PANEL */}
            <div className="relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-b from-cyan-500 to-blue-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
              <div className="relative bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl">
                <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                  <Zap className="text-yellow-400 fill-yellow-400" size={18} /> Quick Order
                </h2>
                
                <form onSubmit={handleBuy} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium uppercase tracking-wider ml-1">Asset</label>
                    <input
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none text-white uppercase placeholder-slate-700 font-mono transition-all"
                      placeholder="SYMBOL"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-500 font-medium uppercase tracking-wider ml-1">Volume</label>
                    <input
                      type="number"
                      className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none text-white placeholder-slate-700 font-mono transition-all"
                      placeholder="0"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                    />
                  </div>
                  <button 
                    type="submit" 
                    className="w-full group relative bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/25 active:scale-[0.98]"
                  >
                    <span className="flex justify-center items-center gap-2">
                      Execute Order <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform"/>
                    </span>
                  </button>
                </form>
              </div>
            </div>

            {/* PORTFOLIO WITH SELL BUTTON */}
            <div className="bg-white/5 backdrop-blur-md rounded-3xl p-6 border border-white/10 shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Briefcase className="text-purple-400" size={18} /> Holdings
              </h2>
              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {portfolio.length === 0 ? (
                  <div className="text-center py-8 text-slate-600 border border-dashed border-slate-800 rounded-xl">
                    No active positions
                  </div>
                ) : (
                  portfolio.map((p) => (
                    <div key={p.id} className="flex justify-between items-center bg-black/30 p-4 rounded-xl border border-white/5 hover:border-white/10 transition-colors group">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white tracking-wide">{p.stock.symbol}</span>
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">EQ</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{p.quantity} Units</p>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="font-mono font-medium text-emerald-400">₹{(p.stock.price * p.quantity).toLocaleString()}</p>
                          <p className="text-[10px] text-slate-600">Avg: ₹{p.stock.price.toFixed(2)}</p>
                        </div>
                        
                        <button 
                          onClick={() => {
                            setSellStock(p); 
                            setSellQuantity(1);
                          }}
                          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all hover:shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                        >
                          Sell
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>

        {/* -------------------------------------------------- */}
        {/* SELL MODAL (Red/Rose Theme)                        */}
        {/* -------------------------------------------------- */}
        {sellStock && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setSellStock(null)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
            ></div>

            <div className="relative bg-[#0f0505] border border-red-500/20 p-8 rounded-3xl shadow-[0_0_50px_rgba(239,68,68,0.15)] max-w-sm w-full animate-in zoom-in-95 duration-200">
              
              <button 
                onClick={() => setSellStock(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition"
              >
                <X size={20} />
              </button>

              <h3 className="text-2xl font-bold text-white mb-1">Sell {sellStock.stock.symbol}</h3>
              <p className="text-slate-500 text-sm mb-6">Current Price: <span className="text-white font-mono">₹{sellStock.stock.price.toFixed(2)}</span></p>

              <form onSubmit={handleSell} className="space-y-6">
                
                <div className="space-y-2">
                  <label className="text-xs text-red-400 uppercase font-bold tracking-wider">Quantity to Sell</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      min="1"
                      max={sellStock.quantity}
                      value={sellQuantity}
                      onChange={(e) => setSellQuantity(e.target.value)}
                      className="w-full bg-red-900/10 border border-red-500/30 rounded-xl px-4 py-3 text-white font-mono focus:outline-none focus:border-red-500 transition-colors"
                    />
                    <button 
                      type="button"
                      onClick={() => setSellQuantity(sellStock.quantity)}
                      className="absolute right-2 top-1.5 text-[10px] bg-red-500/20 text-red-400 px-2 py-1.5 rounded hover:bg-red-500 hover:text-white transition-colors uppercase font-bold"
                    >
                      Max
                    </button>
                  </div>
                  <p className="text-right text-[10px] text-slate-500">Available: {sellStock.quantity}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/5 flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Estimated Gain</span>
                  <span className="font-mono text-xl text-emerald-400 font-bold">
                    ₹{(sellStock.stock.price * sellQuantity).toLocaleString()}
                  </span>
                </div>

                <button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-red-900/40 transition-all active:scale-[0.98]"
                >
                  Confirm Sell Order
                </button>
              </form>
            </div>
          </div>
        )}

        {/* -------------------------------------------------- */}
        {/* DYNAMIC NOTIFICATION POPUP (Green for Buy, Red for Sell) */}
        {/* -------------------------------------------------- */}
        {orderNotification && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            
            <div 
              onClick={() => setOrderNotification(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
            ></div>

            <div className={`relative bg-slate-900 border p-8 rounded-3xl shadow-[0_0_100px_rgba(0,0,0,0.5)] max-w-md w-full animate-in zoom-in-95 fade-in duration-300 ${orderNotification.type === 'SELL' ? 'border-red-500/20 shadow-[0_0_100px_rgba(239,68,68,0.2)]' : 'border-emerald-500/20 shadow-[0_0_100px_rgba(16,185,129,0.2)]'}`}>
              
              {/* Glow Bar */}
              <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 rounded-full shadow-[0_0_20px_rgba(255,255,255,0.5)] ${orderNotification.type === 'SELL' ? 'bg-red-500' : 'bg-emerald-500'}`}></div>

              <button 
                onClick={() => setOrderNotification(null)}
                className="absolute top-4 right-4 p-2 text-slate-500 hover:text-white transition rounded-full hover:bg-white/10"
              >
                <X size={20} />
              </button>

              <div className="text-center space-y-6">
                
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center border shadow-inner ${orderNotification.type === 'SELL' ? 'bg-red-500/10 border-red-500/20' : 'bg-emerald-500/10 border-emerald-500/20'}`}>
                  <CheckCircle className={`drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] ${orderNotification.type === 'SELL' ? 'text-red-400' : 'text-emerald-400'}`} size={40} />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-white tracking-tight">
                    {orderNotification.type === 'SELL' ? 'Sell Executed!' : 'Order Successful!'}
                  </h3>
                  <p className="text-slate-400">
                    You have successfully {orderNotification.type === 'SELL' ? 'sold' : 'acquired'} <br/>
                    <span className={`${orderNotification.type === 'SELL' ? 'text-red-400' : 'text-emerald-400'} font-bold text-lg`}>{orderNotification.quantity}</span> shares of <span className="text-white font-bold text-lg">{orderNotification.symbol}</span>
                  </p>
                </div>

                <div className="bg-black/40 rounded-xl p-4 border border-white/5 space-y-3 relative overflow-hidden">
                  <div className="absolute top-1/2 -left-2 w-4 h-4 bg-slate-900 rounded-full"></div>
                  <div className="absolute top-1/2 -right-2 w-4 h-4 bg-slate-900 rounded-full"></div>

                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Price per share</span>
                    <span className="font-mono text-slate-300">₹{orderNotification.price.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-dashed border-white/10 pt-3">
                    <span className="text-slate-500">Total Amount {orderNotification.type === 'SELL' ? 'Credited' : 'Debited'}</span>
                    <span className={`font-mono font-bold text-lg ${orderNotification.type === 'SELL' ? 'text-red-400' : 'text-emerald-400'}`}>₹{orderNotification.total.toLocaleString()}</span>
                  </div>
                </div>

                <button 
                  onClick={() => setOrderNotification(null)}
                  className={`w-full text-black font-bold py-3 rounded-xl transition-colors shadow-lg ${orderNotification.type === 'SELL' ? 'bg-white hover:bg-red-400' : 'bg-white hover:bg-emerald-400'}`}
                >
                  Done
                </button>

              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;