import { test, expect } from '@playwright/test';

test('shop owner uploads a photo and submits shop details for approval', async ({ page }) => {
  let saved;
  const category = { _id: 'clothing1', name: 'Clothing' };
  let profile = null;
  await page.addInitScript(() => sessionStorage.setItem('p2p-token', 'shop-test'));
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/me') return route.fulfill({ json: { success: true, data: { _id: 'owner', role: 'supplier', name: 'Shop Owner' } } });
    if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [category] } });
    if (path === '/api/suppliers/images') return route.fulfill({ status: 201, json: { success: true, data: { url: '/uploads/1234-abcd.png' } } });
    if (path === '/api/suppliers/me') {
      if (route.request().method() === 'PUT') {
        saved = route.request().postDataJSON(); profile = { ...saved, _id: 'shop1', category, verificationStatus: 'pending' };
      }
      return route.fulfill({ status: profile ? 200 : 404, json: { success: !!profile, data: profile } });
    }
    return route.fulfill({ json: { success: true, data: { items: [], pagination: { pages: 1 } } } });
  });
  await page.goto('/supplier/dashboard?setup=shop');
  await page.getByLabel('Shop name', { exact: true }).fill('Hargeisa Clothing');
  await page.getByLabel('Business address').fill('Hargeisa');
  await page.getByLabel('Phone number', { exact: true }).fill('12345678');
  await page.getByLabel('Shop category').selectOption('clothing1');
  await page.getByLabel('About your shop').fill('Clothing for everyday wear');
  await page.getByLabel('Shop photo or logo', { exact: false }).setInputFiles({ name: 'shop.png', mimeType: 'image/png', buffer: Buffer.from([137,80,78,71,13,10,26,10]) });
  await page.getByRole('button', { name: 'Save business profile' }).click();
  await expect.poll(() => saved?.companyName).toBe('Hargeisa Clothing');
  expect(saved.category).toBe('clothing1'); expect(saved.image).toBe('/uploads/1234-abcd.png');
  await expect(page.getByText('Shop submitted.', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'My products', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Add product', exact: true })).toBeDisabled();
});

test('approved shops appear publicly before adding products and signup selects supplier', async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/suppliers') return route.fulfill({ json: { success: true, data: { items: [{ _id: 'shop1', companyName: 'Hargeisa Clothing', category: { name: 'Clothing' }, description: 'Clothing and uniforms', image: '/uploads/1234-abcd.png', address: 'Hargeisa' }] } } });
    return route.abort();
  });
  await page.goto('/suppliers');
  await expect(page.getByRole('heading', { name: 'Hargeisa Clothing' })).toBeVisible();
  await expect(page.getByText('APPROVED SHOP', { exact: true })).toBeVisible();
  await expect(page.locator('.supplier-card img')).toHaveAttribute('src', 'http://localhost:5000/uploads/1234-abcd.png');
  await page.getByRole('link', { name: 'Register your shop', exact: true }).click();
  await expect(page.getByLabel('I’m here to')).toHaveValue('supplier');
});

test('approved clothing shop appears in its category before it has products', async ({ page }) => {
  const category = { _id: 'clothing1', name: 'clothing' };
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/suppliers') return route.fulfill({ json: { success: true, data: { items: [{ _id: 'shop1', companyName: 'Cloth Brand', category, address: 'Hargeisa', verificationStatus: 'approved' }] } } });
    if (path === '/api/categories') return route.fulfill({ json: { success: true, data: [category] } });
    if (path === '/api/products') return route.fulfill({ json: { success: true, data: { items: [], pagination: { pages: 1 } } } });
    return route.abort();
  });
  await page.goto('/shop?category=Clothing');
  await expect(page.getByRole('region', { name: 'Approved shops' })).toContainText('Cloth Brand');
  await page.getByRole('link', { name: 'Visit shop', exact: false }).click();
  await expect(page).toHaveURL(/supplier=shop1/);
  await expect(page.getByRole('heading', { name: 'Cloth Brand' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'No products listed yet.' })).toBeVisible();
  await page.goto('/shop?category=Beauty');
  await expect(page.getByRole('region', { name: 'Approved shops' })).toHaveCount(0);
});
