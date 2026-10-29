// ---------------------------------------------------------------
// DATA: highest BTC price (USD) reached in each year.
// Sources: Yahoo Finance / StatMuse / Capital.com. Early years (2012-2013)
// differ slightly between exchanges, so treat them as close approximations.
// 2026 is "highest so far this year".
// ---------------------------------------------------------------
const YEARLY_HIGH = {
  2012: 13.5,
  2013: 1151,
  2014: 1017.12,
  2015: 495.56,
  2016: 979.4,
  2017: 20089,
  2018: 17712.4,
  2019: 13796.49,
  2020: 29244.88,
  2021: 68789.63,
  2022: 48086.84,
  2023: 44705.52,
  2024: 108268.45,
  2025: 126198.07,
  2026: 97860.6,
};

const AMOUNTS = [10, 100, 1000, 10000, 100000, 1000000];

const yearSelect = document.getElementById("year");
const amountSelect = document.getElementById("amount");
const refreshBtn = document.getElementById("refresh");
const resultEl = document.getElementById("result");
const detailsEl = document.getElementById("details");
const livePriceEl = document.getElementById("live-price");

let currentPrice = null; // live BTC price in USD

const money = (n, digits = 0) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

// --- Fill the dropdowns -----------------------------------------
for (let y = 2012; y <= 2030; y++) {
  yearSelect.add(new Option(y, y));
}
for (const a of AMOUNTS) {
  amountSelect.add(new Option(money(a), a));
}
yearSelect.value = 2017; // a nicely painful default
amountSelect.value = 1000;

// --- Get the live price (two sources, in case one is down) -------
async function fetchLivePrice() {
  const sources = [
    async () => {
      const r = await fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot");
      const j = await r.json();
      return parseFloat(j.data.amount);
    },
    async () => {
      const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd");
      const j = await r.json();
      return j.bitcoin.usd;
    },
  ];
  for (const source of sources) {
    try {
      const price = await source();
      if (price > 0) return price;
    } catch (e) {
      /* try the next source */
    }
  }
  return null;
}

// --- The formula -------------------------------------------------
//   bitcoins bought = amount invested / highest price of that year
//   value today     = bitcoins bought  * live price today
function calculate(year, amount, livePrice) {
  const buyPrice = YEARLY_HIGH[year];
  const coins = amount / buyPrice;
  const worth = coins * livePrice;
  return { buyPrice, coins, worth };
}

// --- Show the result ---------------------------------------------
async function refresh() {
  refreshBtn.disabled = true;
  refreshBtn.textContent = ">> LOADING... <<";

  const price = await fetchLivePrice();
  if (price) {
    currentPrice = price;
    livePriceEl.textContent = money(price, 2);
  }
  refreshBtn.disabled = false;
  refreshBtn.textContent = ">> REFRESH MY REGRET <<";

  const year = Number(yearSelect.value);
  const amount = Number(amountSelect.value);
  resultEl.className = "big";

  if (!(year in YEARLY_HIGH)) {
    resultEl.textContent = "NICE TRY, TIME TRAVELER.";
    detailsEl.textContent = `${year} hasn't happened yet. Come back then.`;
    return;
  }
  if (!currentPrice) {
    resultEl.textContent = "Can't reach the live price.";
    detailsEl.textContent = "Check your connection and press the button again.";
    return;
  }

  const { buyPrice, coins, worth } = calculate(year, amount, currentPrice);
  resultEl.textContent = money(worth);
  resultEl.classList.add(worth >= amount ? "win" : "lose");

  const multiple = worth / amount;
  detailsEl.textContent =
    `${money(amount)} in ${year} at ${money(buyPrice, 2)} per BTC = ${coins.toFixed(6)} BTC ` +
    `(${multiple >= 1 ? multiple.toFixed(1) + "x your money" : Math.round(multiple * 100) + "% of your money left"})`;
}

refreshBtn.addEventListener("click", refresh);
// Also update when answers change, so the result is never stale.
yearSelect.addEventListener("change", refresh);
amountSelect.addEventListener("change", refresh);

document.getElementById("yr").textContent = new Date().getFullYear();
refresh(); // run once on page load
