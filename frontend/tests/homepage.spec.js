import {test,expect} from '@playwright/test';
for (const width of [1440,1024,768,375]) test(`premium homepage layout and interactions at ${width}px`,async({page})=>{
 await page.route('**/api/**',route=>route.abort());
 await page.setViewportSize({width,height:900}); await page.goto('/');
 await expect(page.getByText('Showing sample products.',{exact:true})).toHaveCount(0);
 await expect(page.locator('.demo-bar')).toHaveCount(0);
 const colors={'.hero':'rgb(255, 254, 252)','.categories-section':'rgb(244, 241, 235)','.products-section':'rgb(248, 246, 241)','.why-section':'rgb(255, 254, 252)','.navbar':'rgb(25, 27, 42)'};
 for(const [selector,color] of Object.entries(colors))await expect(page.locator(selector)).toHaveCSS('background-color',color);
 await expect(page.locator('.category-card')).toHaveCount(8);await expect(page.locator('.service-card')).toHaveCount(4);
 expect(await page.locator('.category-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width>900?4:2);
 await expect(page.locator('#featured-product-panel .product-card')).toHaveCount(8);
 await expect(page.locator('.arrivals-section')).toHaveCount(0);
 const card=page.locator('.product-card').first();await expect(card.getByText(/In stock/)).toBeVisible();await expect(card.getByRole('link',{name:'View details'})).toBeVisible();
 await expect(card.getByRole('button',{name:/Add .* to cart/})).toBeEnabled();
 await page.getByRole('tab',{name:'Under $15'}).click();await expect(page.getByRole('tab',{name:'Under $15'})).toHaveAttribute('aria-selected','true');
 expect(await page.locator('#featured-product-panel .price').allTextContents()).toEqual(expect.arrayContaining([expect.stringContaining('$4.50')]));
 expect(await page.locator('#featured-product-panel .price').evaluateAll(nodes=>nodes.every(n=>Number(n.textContent.match(/[\d.]+/)[0])<15))).toBe(true);
 await page.getByRole('tab',{name:'Featured Products'}).click();
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const copy=await page.locator('.hero-copy').boundingBox(),collage=await page.locator('.hero-composition').boundingBox();
 if(width>760)expect(copy.x+copy.width).toBeLessThanOrEqual(collage.x);else expect(copy.y+copy.height).toBeLessThanOrEqual(collage.y);
 await page.locator('img').evaluateAll(imgs=>imgs.forEach(img=>{img.loading='eager';}));
 await expect.poll(()=>page.locator('img').evaluateAll(imgs=>imgs.every(i=>i.complete&&i.naturalWidth>0))).toBeTruthy();
 await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`test-results/premium-home-${width}.png`,fullPage:true});await page.screenshot({path:`test-results/premium-hero-${width}.png`});
 await page.getByRole('searchbox',{name:'Search wholesale products'}).fill('headphones');await page.getByRole('button',{name:'Search the marketplace',exact:true}).click();
 await expect(page).toHaveURL('/shop?search=headphones');await expect(page.locator('.product-card')).toHaveCount(1);
 if(width===375){await page.getByRole('button',{name:'Toggle menu'}).click();await expect(page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Categories',exact:true})).toBeVisible();}
});
test('empty live catalog shows labeled, usable demo products',async({page})=>{
 await page.route('**/api/products?**',route=>route.fulfill({json:{success:true,data:{items:[],pagination:{pages:0}}}}));
 await page.goto('/');await expect(page.locator('#featured-product-panel .product-card')).toHaveCount(8);await expect(page.locator('.arrivals-section')).toHaveCount(0);await expect(page.getByText('Showing sample products.',{exact:true})).toHaveCount(0);
 await page.locator('#featured-product-panel .product-card').first().getByRole('button',{name:/Add .* to cart/}).click();
 await page.goto('/cart');await expect(page.locator('.cart-row')).toHaveCount(1);await page.getByRole('link',{name:'Continue to checkout'}).click();await expect(page.getByText('Demo checkout',{exact:false})).toBeVisible();
});
test('real products stay live even when the categories API fails; tabs sort and filter real data',async({page})=>{
 const products=[{_id:'live-old',name:'Earlier product',price:25,minimumOrderQuantity:2,stockQuantity:20,unit:'box',category:{_id:'cat',name:'Home & Kitchen'},supplier:{_id:'s',companyName:'Real Supplier'},images:['/product-placeholder.svg'],createdAt:'2026-01-01T00:00:00Z'},{_id:'live-new',name:'Recent product',price:10,minimumOrderQuantity:5,stockQuantity:30,unit:'piece',category:{_id:'cat2',name:'Clothing'},supplier:{_id:'s',companyName:'Real Supplier'},images:['/product-placeholder.svg'],createdAt:'2026-10-21T00:00:00Z'}];
 await page.route('**/api/products?**',route=>route.fulfill({json:{success:true,data:{items:products,pagination:{pages:1}}}}));await page.route('**/api/categories',route=>route.abort());
 await page.goto('/');await expect(page.locator('#featured-product-panel .product-card')).toHaveCount(2);await expect(page.getByText('Showing sample products.',{exact:true})).toHaveCount(0);
 await page.getByRole('tab',{name:'New & Noteworthy'}).click();await expect(page.locator('#featured-product-panel .product-name').first()).toHaveText('Recent product');
 await page.getByRole('tab',{name:'Under $15'}).click();await expect(page.locator('#featured-product-panel .product-card')).toHaveCount(1);await expect(page.locator('#featured-product-panel .product-name')).toHaveText('Recent product');
 await page.getByRole('tab',{name:'Featured Products'}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'New & Noteworthy'})).toBeFocused();await expect(page.getByRole('tab',{name:'New & Noteworthy'})).toHaveAttribute('aria-selected','true');
});
test('cards show keyboard focus and honor reduced motion',async({page})=>{
 await page.route('**/api/**',route=>route.abort());await page.goto('/');
 const category=page.locator('.category-card').first();await category.focus();await expect(category).toBeFocused();await expect(category).toHaveCSS('border-top-color','rgb(154, 122, 81)');
 await page.emulateMedia({reducedMotion:'reduce'});await category.hover();await expect(category).toHaveCSS('transform','none');
 const product=page.locator('#featured-product-panel .product-card').first();await product.getByRole('link',{name:'View details'}).focus();await expect(product).toHaveCSS('border-top-color','rgb(154, 122, 81)');
});
