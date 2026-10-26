import { test, expect } from '@playwright/test';

test('supplier workspace pages support searching and responsive layouts', async ({ page }) => {
  const category = { _id: 'clothing', name: 'Clothing' };
  const supplier = { _id: 'shop1', companyName: 'Cloth Brand', address: 'Hargeisa', phone: '12345678', category, description: 'Wholesale clothing', verificationStatus: 'approved' };
  const products = [{ _id: 'shirt', name: 'Cotton shirt', price: 10, stockQuantity: 40, minimumOrderQuantity: 2, sellingType: 'wholesale', isActive: true, category, supplier, images: [] }];
  const orders = [{ _id: 'order1', orderStatus: 'pending', totalAmount: 30, deliveryAddress: 'Buyer shop, Hargeisa', createdAt: '2026-10-22T10:00:00Z', supplierAmounts: { grossAmount: 30, commissionAmount: 0.6, supplierNetAmount: 29.4 }, items: [{ _id: 'item1', productName: 'Cotton shirt', quantity: 3, unitPrice: 10, subtotal: 30, commissionAmount: 0.6, supplierNetAmount: 29.4, fulfillmentStatus: 'pending' }] }];
  await page.addInitScript(() => sessionStorage.setItem('p2p-token', 'supplier-test'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/orders/order1/fulfillment' && route.request().method() === 'PATCH') {
      const update = route.request().postDataJSON();
      expect(update.itemId).toBe('item1');
      orders[0].items[0].fulfillmentStatus = update.fulfillmentStatus;
      orders[0].orderStatus = update.fulfillmentStatus;
      return route.fulfill({ json: { success: true, data: orders[0] } });
    }
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: { _id: 'owner', role: 'supplier', name: 'Shop Owner' } } });
    if (path === '/api/suppliers/me') return route.fulfill({ json: { success: true, data: supplier } });
    if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [category] } });
    const items = path === '/api/suppliers/me/orders' ? orders : path.includes('products') ? products : [];
    return route.fulfill({ json: { success: true, data: { items, pagination: { pages: 1 } } } });
  });
  await page.goto('/supplier/dashboard');
  await expect(page.locator('.supplier-earnings-overview')).toContainText('$29.40');
  await page.getByRole('button', { name: 'My products', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search products', exact: true }).fill('Cotton');
  await expect(page.locator('.management-product-cell img')).toHaveCount(1);
  await page.getByLabel('Filter products by status').selectOption('inactive');
  await expect(page.locator('tbody tr')).toHaveCount(0);
  await page.getByRole('button', { name: 'Incoming orders', exact: true }).click();
  await page.getByLabel('Search orders').fill('Hargeisa');
  await expect(page.getByLabel('Fulfillment for Cotton shirt')).toBeVisible();
  await page.screenshot({ path: 'test-results/supplier-orders-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Accept order', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark as shipped', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Mark as shipped', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Mark as delivered', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Cancel item', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mark as delivered', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Fulfillment for Cotton shirt' })).toContainText('delivered');
  await page.getByRole('button', { name: 'Business profile', exact: true }).click();
  await expect(page.getByLabel('Shop name', { exact: true })).toHaveValue('Cloth Brand');
  await page.screenshot({ path: 'test-results/supplier-profile-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  for (const name of ['Overview', 'My products', 'Incoming orders', 'Business profile']) {
    await page.getByRole('button', { name, exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), name).toBe(true);
  }
  await page.screenshot({ path: 'test-results/supplier-profile-mobile.png', fullPage: true });
});
