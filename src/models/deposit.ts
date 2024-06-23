export type UTXOTransactionSchema = {
  // _id: { $oid: string };
  address: string;
  amount: number;
  confirmations: number;
  name?: string;
  vout: number;
}
