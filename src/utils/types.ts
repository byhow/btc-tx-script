export type TransactionResponse = {
  transactions: Transaction[];
  lastblock: string;
};

export type Transaction = {
  involvesWatchonly: boolean;
  account: string;
  address: string;
  category: string;
  amount: number;
  label: string;
  confirmations: number;
  blockhash: string;
  blockindex: number;
  blocktime: number;
  txid: string;
  vout: number;
  walletconflicts: unknown[];
  time: number;
  timereceived: number;
  "bip125-replaceable": string;
};