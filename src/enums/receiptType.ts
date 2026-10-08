/**
 * Receipt types used by the `receipts.type` column.
 * Mirrors the DBML `ENUM('PURCHASE', 'SALE')` definition.
 */
export enum ReceiptType {
  PURCHASE = 'PURCHASE',
  SALE = 'SALE',
}
