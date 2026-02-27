// homepage.js — KryptoPesa Dashboard Logic (standalone, all logic is also inline in homepage.html)
// This file is provided for external linking; homepage.html contains all logic inline for reliability.

const MIN_KES = 100;
const MAX_KES = 300000;

const CRYPTO_META = {
  BTC:  { name:'Bitcoin',   sym:'BTC',  icon:'₿',  bg:'#f7931a', wk:'BTCUSDT'  },
  ETH:  { name:'Ethereum',  sym:'ETH',  icon:'Ξ',  bg:'#627eea', wk:'ETHUSDT'  },
  SOL:  { name:'Solana',    sym:'SOL',  icon:'◎',  bg:'#9945ff', wk:'SOLUSDT'  },
  USDT: { name:'Tether',    sym:'USDT', icon:'₮',  bg:'#26a17b', wk:'USDTUSDT' },
  WLD:  { name:'Worldcoin', sym:'WLD',  icon:'🌐', bg:'#1a1a1a', wk:'WLDUSDT'  }
};

const WALLET_ADDRESSES = {
  BTC:  { net:'Bitcoin (BTC Native SegWit)', addr:'bc1qkp0rqpwr5l3d5l69kjrsvvq27c8gx3d48s7jy4', warn:'Only send BTC on the Bitcoin network.' },
  ETH:  { net:'Ethereum (ERC-20)',           addr:'0x7A0fC9f49fE7F6bAfEe1a81e3A5b9C55c7bE3f21', warn:'Send ETH on Ethereum mainnet only.' },
  SOL:  { net:'Solana (SOL)',                addr:'8cSeXM9HPCgkWRCn5Pxx9uWNXwR7bFP7E9CkEf2NBXPB', warn:'Send SOL on Solana network only.' },
  USDT: { net:'Ethereum (ERC-20)',           addr:'0x9a8f92a830A5cB89a3816e3D267CB7791c16b04D', warn:'ERC-20 only.', alt:{ net:'TRON (TRC-20)', addr:'TMBHYu6bZqRaA1HZjYBzVBdCJNiLVP9RLM' } },
  WLD:  { net:'Optimism (OP Mainnet)',       addr:'0x4C5c2e9E6F1234567890Ab3456789012cDEf2345', warn:'WLD is on Optimism, not Ethereum mainnet.' }
};

console.log('homepage.js loaded — all logic is embedded in homepage.html for reliability.');
