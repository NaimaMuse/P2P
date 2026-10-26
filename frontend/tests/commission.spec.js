import { test, expect } from '@playwright/test';

test('supplier sees commission and net earnings for its order items', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('p2p-token', 'supplier-test'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: { _id: 'owner', role: 'supplier', name: 'Shop Owner' } } });
    if (path === '/api/suppliers/me') return route.fulfill({ json: { success: true, data: { _id: 'shop', companyName: 'Clothing', verificationStatus: 'approved' } } });
    if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [] } });
    const items = path === '/api/suppliers/me/orders' ? [{ _id: 'order1', totalAmount: 30, orderStatus: 'pending', deliveryAddress: 'Shop', supplierAmounts: { grossAmount: 30, commissionAmount: 0.6, supplierNetAmount: 29.4 }, items: [{ _id: 'item1', productName: 'Cotton shirt', quantity: 3, unitPrice: 10, subtotal: 30, fulfillmentStatus: 'pending', commissionAmount: 0.6, supplierNetAmount: 29.4 }] }] : [];
    return route.fulfill({ json: { success: true, data: { items, pagination: { pages: 1 } } } });
  });
  await page.goto('/supplier/dashboard');
  await page.getByRole('button', { name: 'Incoming orders', exact: true }).click();
  await expect(page.getByText('Supplier commission: $0.60', { exact: false })).toBeVisible();
  await expect(page.getByText('Sales: $30.00', { exact: false })).toContainText('Net earnings: $29.40');
});
