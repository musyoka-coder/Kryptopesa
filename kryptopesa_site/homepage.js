
const priceContainer = document.getElementById('priceContainer');
const kycStatus = document.getElementById('kycStatus');

const cryptos = {
    bitcoin: 'BTC',
    ethereum: 'ETH',
    tether: 'USDT',
    'usd-coin': 'KESDT',
    'worldcoin-wld': 'WLD'
};

function showSection(id) {
    document.querySelectorAll('main section').forEach(sec => sec.classList.remove('active'));
    document.getElementById(id).classList.add('active');
}

function verifyKYC() {
    kycStatus.textContent = 'KYC: Verified';
    event.target.style.display = 'none';
}

document.addEventListener("DOMContentLoaded", () => {
    const cryptos = {
        "BTCUSDT": "Bitcoin",
        "ETHUSDT": "Ethereum",
        "SOLUSDT": "Solana",
        "WLDUSDT": "Worldcoin"
    };

    const priceContainer = document.getElementById("priceContainer");

    for (let symbol in cryptos) {
        const div = document.createElement("div");
        div.className = "shadow-box";
        div.innerHTML = `<h3>${cryptos[symbol]}</h3><p id="${symbol}-price">Loading...</p>`;
        priceContainer.appendChild(div);
    }

    const ws = new WebSocket('wss://stream.binance.com:9443/ws/!ticker@arr');

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        data.forEach(ticker => {
            if (cryptos[ticker.s]) {
                const priceElement = document.getElementById(`${ticker.s}-price`);
                if (priceElement) {
                    priceElement.innerText = `$${parseFloat(ticker.c).toFixed(3)}`;
                }
            }
        });
    };
});


function swapToMpesa() {
    const amount = parseFloat(document.getElementById('amount').value);
    const number = document.getElementById('mpesaNumber').value;
    const crypto = document.getElementById('cryptoType').value;
    if (!amount || !number) return alert('Fill all fields');
    document.getElementById('swapResult').textContent = `Swapped ${amount} ${cryptos[crypto]} to M-Pesa: ${number}`;
}

fetchPrices();
setInterval(fetchPrices, 60000); // Refresh every minute
