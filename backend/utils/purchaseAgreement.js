import { createHash } from 'node:crypto';

// Publish a new version whenever this text changes. Orders retain their own copy.
export const purchaseAgreement = {
  version: '2026-10-22.2',
  text: 'I confirm the products, quantities, prices, and delivery details shown for this order. Zaad and eDahab payments here are simulations: no money is charged and payment remains pending. If Cash on Delivery is selected, payment is due on delivery. My confirmation and order details are saved for later review.',
};
purchaseAgreement.hash = createHash('sha256').update(purchaseAgreement.text).digest('hex');
