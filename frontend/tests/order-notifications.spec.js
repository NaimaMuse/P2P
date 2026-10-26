import { test, expect } from '@playwright/test';

for (const role of ['buyer', 'supplier']) {
  test(`${role} receives order notification and opens the current order`, async ({ page }) => {
    let changed = false, read = false;
    const status = role === 'buyer' ? 'cancelled' : 'pending';
    const message = role === 'buyer' ? 'Cotton shirt in order #ORDER123 was cancelled by Clothing Shop. Overall order status: cancelled.' : 'New order #ORDER123 received. Open Incoming orders to process your items.';
    const order = { _id: 'order123', createdAt: '2026-10-22T10:00:00Z', orderStatus: status, totalAmount: 30, deliveryAddress: 'Buyer shop', paymentStatus: 'pending', items: [{ _id: 'item1', productName: 'Cotton shirt', quantity: 3, unitPrice: 10, subtotal: 30, fulfillmentStatus: status }] };
    await page.addInitScript(() => sessionStorage.setItem('p2p-token', 'notification-test'));
    await page.route('**/api/**', route => {
      const path = new URL(route.request().url()).pathname;
      if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: { _id: 'user1', name: 'Test User', role } } });
      if (path === '/api/auth/notifications') return route.fulfill({ json: { success: true, data: { items: changed ? [{ _id: 'notice1', order: 'order123', message, createdAt: '2026-10-22T10:00:00Z', readAt: read ? '2026-10-22T10:01:00Z' : null }] : [], unreadCount: changed && !read ? 1 : 0 } } });
      if (path === '/api/auth/notifications/notice1/read') { read = true; return route.fulfill({ json: { success: true, data: {} } }); }
      if (path === '/api/suppliers/me') return route.fulfill({ json: { success: true, data: { _id: 'shop1', companyName: 'Clothing Shop', verificationStatus: 'approved' } } });
      if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [] } });
      const items = changed && path.includes('orders') ? [order] : [];
      return route.fulfill({ json: { success: true, data: { items, pagination: { pages: 1 } } } });
    });
    await page.goto(role === 'buyer' ? '/orders' : '/supplier/dashboard');
    await expect(page.getByRole('button', { name: 'Notifications', exact: true })).toBeVisible();
    changed = true;
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByRole('button', { name: 'Notifications, 1 unread', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Order notifications' })).toContainText(message);
    await page.setViewportSize({ width: 375, height: 812 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.getByRole('link', { name: message, exact: false }).click();
    await expect.poll(() => read).toBe(true);
    await expect(page).toHaveURL(role === 'buyer' ? /orders\?order=order123/ : /supplier\/dashboard\?tab=orders&order=order123/);
    if (role === 'buyer') await expect(page.locator('.order-expanded')).toContainText('cancelled');
    else await expect(page.getByLabel('Fulfillment for Cotton shirt')).toBeVisible();
  });
}
