import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { DEFAULTS, KARATS } from "./config/karats.js";
import { money, rowTotal, unitPrice } from "./calculations/gold.js";
import "./styles/app.css";

function App() {
  const [goldPrice, setGoldPrice] = useState(DEFAULTS.goldPrice);
  const [payout, setPayout] = useState(DEFAULTS.payout);
  const [unit, setUnit] = useState(DEFAULTS.weightUnit);
  const [weights, setWeights] = useState(() => Object.fromEntries(KARATS.map(k => [k, ""])));

  const rows = useMemo(() => KARATS.map(karat => {
    const weight = weights[karat] || 0;
    const price = goldPrice ? unitPrice({ goldPrice, payout, karat, unit }) : 0;
    const total = goldPrice ? rowTotal({ goldPrice, payout, karat, weight, unit }) : 0;
    return { karat, weight, price, total };
  }), [goldPrice, payout, unit, weights]);

  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  const reset = () => {
    setGoldPrice("");
    setPayout(DEFAULTS.payout);
    setUnit(DEFAULTS.weightUnit);
    setWeights(Object.fromEntries(KARATS.map(k => [k, ""])));
  };

  return (
    <main className="app">
      <header>
        <div className="brand">OR</div>
        <div><h1>OR BULLION</h1><p>Gold Calculator</p></div>
      </header>

      <section className="controls">
        <label>Gold Price<input inputMode="decimal" value={goldPrice} placeholder="$0.00" onChange={e => setGoldPrice(e.target.value)} /></label>
        <label>Payout<input inputMode="decimal" value={payout} onChange={e => setPayout(e.target.value)} /><span className="suffix">%</span></label>
        <label>Weight Unit<select value={unit} onChange={e => setUnit(e.target.value)}><option value="dwt">DWT</option><option value="gram">Gram</option></select></label>
      </section>

      <section className="table">
        <div className="row heading"><span>Gold</span><span>Weight</span><span>Unit Price</span><span>Total</span></div>
        {rows.map(row => (
          <div className="row" key={row.karat}>
            <strong>{row.karat}K</strong>
            <input aria-label={`${row.karat}K weight`} inputMode="decimal" value={weights[row.karat]} placeholder="0.00"
              onChange={e => setWeights({ ...weights, [row.karat]: e.target.value })} />
            <span>{goldPrice ? money(row.price) : "—"}</span>
            <strong>{goldPrice && row.weight ? money(row.total) : "—"}</strong>
          </div>
        ))}
      </section>

      <section className="summary"><span>Estimated Total</span><strong>{money(grandTotal)}</strong></section>
      <div className="actions"><button className="secondary" onClick={reset}>Reset</button><button disabled>Share <small>coming next</small></button></div>
      <footer>OR Bullion • Precious Metal Refining</footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
