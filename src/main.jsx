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
  const [shareStatus, setShareStatus] = useState("");

  const rows = useMemo(() => KARATS.map(karat => {
    const weight = weights[karat] || 0;
    const price = goldPrice ? unitPrice({ goldPrice, payout, karat, unit }) : 0;
    const total = goldPrice ? rowTotal({ goldPrice, payout, karat, weight, unit }) : 0;
    return { karat, weight, price, total };
  }), [goldPrice, payout, unit, weights]);

  const activeRows = rows.filter(row => Number(row.weight) > 0);
  const grandTotal = rows.reduce((sum, row) => sum + row.total, 0);

  const reset = () => {
    setGoldPrice("");
    setPayout(DEFAULTS.payout);
    setUnit(DEFAULTS.weightUnit);
    setWeights(Object.fromEntries(KARATS.map(k => [k, ""])));
    setShareStatus("");
  };

  const receiptText = () => {
    const lines = activeRows.map(r =>
      `${r.karat}K  ${Number(r.weight).toFixed(2)} ${unit.toUpperCase()} × ${money(r.price)} = ${money(r.total)}`
    );
    return [
      "OR BULLION — GOLD CALCULATION",
      new Date().toLocaleString(),
      "",
      `Gold Price: ${money(Number(goldPrice || 0))}/ozt`,
      `Payout: ${payout}%`,
      `Weight Unit: ${unit.toUpperCase()}`,
      "",
      ...lines,
      "",
      `ESTIMATED TOTAL: ${money(grandTotal)}`,
      "",
      "OR Bullion • Precious Metal Refining"
    ].join("\n");
  };

  const share = async () => {
    if (!goldPrice || activeRows.length === 0) return;
    const text = receiptText();
    try {
      if (navigator.share) {
        await navigator.share({ title: "OR Bullion Calculation", text });
        setShareStatus("Shared");
      } else {
        await navigator.clipboard.writeText(text);
        setShareStatus("Copied to clipboard");
      }
    } catch (error) {
      if (error?.name !== "AbortError") setShareStatus("Unable to share");
    }
  };

  return (
    <main className="app">
      <header className="topbar">
        <div className="brandMark"><span>OR</span></div>
        <div className="brandCopy"><h1>OR BULLION</h1><p>Precious Metal Refining</p></div>
        <div className="liveBadge"><i></i> Calculator</div>
      </header>

      <section className="hero">
        <p className="eyebrow">GOLD CALCULATOR</p>
        <h2>Refining value, calculated instantly.</h2>
        <p>Enter today's gold price, payout and weight. Values update automatically.</p>
      </section>

      <section className="controlCard">
        <label><span>Gold Price / OZT</span><div className="field prefix"><b>$</b><input aria-label="Gold price" inputMode="decimal" value={goldPrice} placeholder="0.00" onChange={e => setGoldPrice(e.target.value)} /></div></label>
        <label><span>Payout</span><div className="field suffixField"><input aria-label="Payout" inputMode="decimal" value={payout} onChange={e => setPayout(e.target.value)} /><b>%</b></div></label>
        <label><span>Weight Unit</span><select aria-label="Weight unit" value={unit} onChange={e => setUnit(e.target.value)}><option value="dwt">DWT</option><option value="gram">GRAM</option></select></label>
      </section>

      <section className="calculatorCard">
        <div className="row heading"><span>Karat</span><span>Gross Weight</span><span>Unit Price</span><span>Amount</span></div>
        {rows.map(row => (
          <div className={`row ${Number(row.weight) ? "active" : ""}`} key={row.karat}>
            <strong className="karat">{row.karat}<small>K</small></strong>
            <div className="weightField"><input aria-label={`${row.karat}K weight`} inputMode="decimal" value={weights[row.karat]} placeholder="0.00" onChange={e => setWeights({ ...weights, [row.karat]: e.target.value })} /><em>{unit}</em></div>
            <span className="unitPrice">{goldPrice ? money(row.price) : "—"}</span>
            <strong className="amount">{goldPrice && row.weight ? money(row.total) : "—"}</strong>
          </div>
        ))}
      </section>

      <section className="summaryCard">
        <div><span>Estimated Payout</span><small>{activeRows.length} active karat{activeRows.length === 1 ? "" : "s"} • {payout}% payout</small></div>
        <strong>{money(grandTotal)}</strong>
      </section>

      <div className="actions">
        <button className="secondary" onClick={reset}>Reset</button>
        <button className="primary" onClick={share} disabled={!goldPrice || activeRows.length === 0}>Share Calculation</button>
      </div>
      {shareStatus && <p className="status">{shareStatus}</p>}

      <section className="disclaimer">Estimates are based on the entered market price, payout percentage and weights. Final settlement may vary.</section>
      <footer><span>OR BULLION</span><small>Gold • Silver • Platinum • Palladium</small></footer>
    </main>
  );
}

createRoot(document.getElementById("root")).render(<React.StrictMode><App /></React.StrictMode>);
