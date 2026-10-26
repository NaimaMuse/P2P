// Legacy products keep their existing minimum; explicit selling types govern new products.
export function sellingTypeFor(product) {
  if (product.sellingType === 'single' || product.sellingType === 'wholesale') return product.sellingType;
  return product.minimumOrderQuantity > 1 ? 'wholesale' : 'single';
}
export function minimumOrderFor(product) {
  return sellingTypeFor(product) === 'single' ? 1 : Math.max(2, product.minimumOrderQuantity || 2);
}
export function sellingTypeLabel(product) {
  return sellingTypeFor(product) === 'single' ? 'Single Item' : 'Wholesale';
}
export function minimumOrderText(product) {
  const quantity = minimumOrderFor(product);
  return `Minimum Order: ${quantity} ${quantity === 1 ? 'item' : 'items'}`;
}
export function validProductQuantity(product, quantity) {
  return Number.isSafeInteger(quantity) && quantity >= minimumOrderFor(product) && quantity <= product.stockQuantity;
}
