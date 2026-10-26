import { test, expect } from '@playwright/test';

test('admin sees a registered supplier before shop details exist', async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem('p2p-token', 'admin-test'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: { _id: 'admin', role: 'admin', name: 'Admin' } } });
    if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [] } });
    const items = path === '/api/admin/suppliers' ? [{ _id: 'new-account', companyName: 'New Supplier', user: { name: 'New Supplier', email: 'supplier@example.com' }, verificationStatus: 'pending', profileRequired: true }] : [];
    return route.fulfill({ json: { success: true, data: { items, pagination: { pages: 1 } } } });
  });
  await page.goto('/admin/dashboard');
  await page.getByRole('button', { name: 'Suppliers', exact: true }).click();
  await expect(page.getByText('supplier@example.com')).toBeVisible();
  await expect(page.getByText('Registered supplier account')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Approve', exact: false })).toBeEnabled();
});

test('supplier receives saved admin decision when dashboard refreshes', async ({ page }) => {
  let status = 'pending';
  await page.addInitScript(() => sessionStorage.setItem('p2p-token', 'supplier-test'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: { _id: 'owner', role: 'supplier', name: 'Supplier' } } });
    if (path === '/api/suppliers/me') return route.fulfill({ json: { success: true, data: { _id: 'shop', companyName: 'Shop', verificationStatus: status, verificationNotification: { status, message: status === 'approved' ? 'Your shop has been approved by an admin.' : 'Your shop is waiting for admin approval.', createdAt: '2026-10-22T10:00:00Z' } } } });
    if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [] } });
    return route.fulfill({ json: { success: true, data: { items: [], pagination: { pages: 1 } } } });
  });
  await page.goto('/supplier/dashboard');
  await expect(page.getByLabel('Shop verification notification')).toContainText('waiting');
  status = 'approved';
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  await expect(page.getByLabel('Shop verification notification')).toContainText('approved by an admin');
  await page.getByRole('button', { name: 'My products', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add product', exact: true })).toBeEnabled();
});
