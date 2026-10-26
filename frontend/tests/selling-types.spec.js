import { test, expect } from '@playwright/test';
const category={_id:'cat1',name:'Clothing'};
const owner={_id:'supplier1',companyName:'Test Supplier',verificationStatus:'approved'};
function product(id,type,minimum=type==='single'?1:5) { return {_id:id,name:`${type} product`,sellingType:type,minimumOrderQuantity:minimum,price:20,stockQuantity:50,unit:'bag',category,supplier:owner,images:[],createdAt:'2026-10-01'}; }
async function buyerCatalog(page,products) {
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/api/categories')return route.fulfill({json:{success:true,data:[category]}});
  if(path==='/api/products/images')return route.fulfill({status:201,json:{success:true,data:{url:'/uploads/12345678-abcd.jpg'}}});
  if(path==='/api/products')return route.fulfill({json:{success:true,data:{items:products,pagination:{pages:1}}}});
  return route.abort();
 });
}
test('selling type labels, product quantity limits and cart rules agree',async({page})=>{
 await buyerCatalog(page,[product('single','single'),product('bulk','wholesale')]);
 await page.goto('/shop');await expect(page.locator('.selling-type-label').filter({hasText:'Single Item'})).toHaveCount(1);await expect(page.locator('.selling-type-label').filter({hasText:'Wholesale'})).toHaveCount(1);
 await page.goto('/products/single');await expect(page.getByRole('spinbutton',{name:'Product quantity'})).toHaveValue('1');await expect(page.getByText('Minimum Order: 1 item',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'Add to Cart',exact:true}).click();await page.goto('/cart');await expect(page.getByRole('spinbutton')).toHaveValue('1');await page.getByRole('spinbutton').fill('3');await expect(page.getByRole('spinbutton')).toHaveValue('3');
 await page.goto('/products/bulk');await expect(page.getByRole('spinbutton',{name:'Product quantity'})).toHaveValue('5');await page.getByRole('spinbutton',{name:'Product quantity'}).fill('1');await expect(page.getByRole('button',{name:'Add to Cart',exact:true})).toBeDisabled();
 await page.getByRole('spinbutton',{name:'Product quantity'}).fill('5');await page.getByRole('button',{name:'Add to Cart',exact:true}).click();await page.goto('/cart');
 await expect(page.locator('.cart-row')).toHaveCount(2);const bulk=page.locator('.cart-row').filter({hasText:'wholesale product'});await bulk.getByRole('spinbutton').fill('1');await expect(bulk.getByRole('spinbutton')).toHaveValue('5');
});
test('older persisted carts and single items with stale minimum metadata remain usable',async({page})=>{
 const old=product('legacy','wholesale',7);delete old.sellingType;
 const single=product('single','single',99);
 await buyerCatalog(page,[old,single]);
 await page.addInitScript(({old,single})=>localStorage.setItem('p2p-cart',JSON.stringify([{product:old,quantity:7},{product:single,quantity:1}])),{old,single});
 await page.goto('/cart');await expect(page.locator('.cart-row')).toHaveCount(2);await expect(page.getByText('Minimum Order: 7 items',{exact:false})).toBeVisible();await expect(page.getByText('Minimum Order: 1 item',{exact:false})).toBeVisible();
});
test('supplier create/edit form supports both types and retains hidden historical units',async({page})=>{
 const products=[];const writes=[];
 await page.route('**/uploads/*.jpg',route=>route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64')}));
 await page.addInitScript(()=>sessionStorage.setItem('p2p-token','supplier-test-token'));
 await page.route('**/api/**',route=>{
  const path=new URL(route.request().url()).pathname, method=route.request().method();
  if(path==='/api/auth/me')return route.fulfill({json:{success:true,data:{_id:'u1',role:'supplier',name:'Supplier'}}});
  if(path==='/api/suppliers/me')return route.fulfill({json:{success:true,data:owner}});
  if(path==='/api/products/images')return route.fulfill({status:201,json:{success:true,data:{url:'/uploads/12345678-abcd.jpg'}}});
  if(path==='/api/categories')return route.fulfill({json:{success:true,data:[category]}});
  if((path==='/api/products'&&method==='POST')||(path.startsWith('/api/products/')&&method==='PUT')){
   const body=route.request().postDataJSON();writes.push({method,body});
   const saved={...product('p1',body.sellingType),...body,category,supplier:owner,unit:'bag'};
   products.splice(0,products.length,saved);return route.fulfill({status:method==='POST'?201:200,json:{success:true,data:saved}});
  }
  return route.fulfill({json:{success:true,data:{items:path.includes('/orders')?[]:products,pagination:{pages:1}}}});
 });
 await page.goto('/supplier/dashboard');await page.getByRole('button',{name:'My products',exact:true}).click();await page.getByRole('button',{name:'Add product',exact:true}).click();
 await expect(page.getByLabel('Product Selling Type')).toHaveValue('wholesale');await expect(page.getByLabel('Minimum Order Quantity')).toHaveAttribute('min','2');await expect(page.getByLabel(/Unit \(piece/)).toHaveCount(0);
 await page.getByLabel('Product name',{exact:true}).fill('Test shirt');await page.getByLabel('Unit price (USD)',{exact:true}).fill('5');await page.getByLabel('Stock quantity',{exact:true}).fill('30');await page.getByRole('combobox',{name:'Category',exact:true}).selectOption('cat1');
 await page.getByLabel('Minimum Order Quantity').fill('1');await page.getByRole('button',{name:'Save product',exact:true}).click();expect(writes).toHaveLength(0);
 await page.getByLabel('Product Selling Type').selectOption('single');await expect(page.getByLabel('Minimum Order Quantity')).toHaveCount(0);
 await page.getByLabel('Product Images',{exact:true}).setInputFiles({name:'photo.jpg',mimeType:'image/jpeg',buffer:Buffer.from([255,216,255,217])});
 await page.getByRole('button',{name:'Save product',exact:true}).click();await expect.poll(()=>writes.length).toBe(1);expect(writes[0].body.sellingType).toBe('single');expect(writes[0].body.minimumOrderQuantity).toBe(1);expect(writes[0].body.unit).toBeUndefined();expect(writes[0].body.images).toEqual(['/uploads/12345678-abcd.jpg']);
 await page.getByRole('button',{name:'Edit Test shirt',exact:true}).click();await expect(page.getByLabel('Product Selling Type')).toHaveValue('single');await page.getByLabel('Product Selling Type').selectOption('wholesale');await page.getByLabel('Minimum Order Quantity').fill('10');
 await page.getByRole('button',{name:'Save product',exact:true}).click();await expect.poll(()=>writes.length).toBe(2);expect(writes[1].method).toBe('PUT');expect(writes[1].body.sellingType).toBe('wholesale');expect(writes[1].body.minimumOrderQuantity).toBe(10);expect(writes[1].body.unit).toBeUndefined();expect(products[0].unit).toBe('bag');
 await page.getByRole('link',{name:'Shop',exact:true}).first().click();
 await expect(page.locator('.product-card').filter({hasText:'Test shirt'})).toBeVisible();
 await expect(page.locator('.product-card img')).toHaveAttribute('src','http://localhost:5000/uploads/12345678-abcd.jpg');
 await page.getByRole('radio',{name:'Clothing',exact:true}).click();
 await expect(page.getByRole('radio',{name:'Clothing',exact:true})).toBeChecked();
 await expect(page.locator('.product-card')).toHaveCount(1);
});
test('homepage Beauty category finds live products stored under beauty',async({page})=>{
 const live = {...product('suncream','single'),category:{_id:'beauty1',name:'beauty'}};
 await buyerCatalog(page,[live]);
 await page.goto('/shop?category=Beauty%20%26%20Personal%20Care');
 await expect(page.locator('.product-card')).toHaveCount(1);
 await expect(page.locator('.product-name')).toHaveText('single product');
});
