import { test, expect } from "@playwright/test";
const errors = [];
test.beforeEach(async ({ page }) => {
  errors.length = 0;
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/**", (route) => route.abort());
});
test.afterEach(() => {
  expect(errors).toEqual([]);
});
test("diverse homepage, local photography, category navigation, and screenshots", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByText("Showing sample products."),
  ).toHaveCount(0);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Everything Your",
  );
  await expect(page.locator(".category-card")).toHaveCount(8);
  await expect(page.locator(".product-card")).toHaveCount(8);
  await expect(page.locator(".arrivals-section")).toHaveCount(0);
  await page.locator("footer").scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((imgs) =>
          imgs.every((i) => i.complete && i.naturalWidth > 0),
        ),
    )
    .toBeTruthy();
  await page.evaluate(() => scrollTo(0, 0));
  await page.screenshot({
    path: "test-results/home-desktop.png",
    fullPage: true,
  });
  await page.getByRole("link", { name: "View all categories" }).click();
  await expect(page.locator(".category-card")).toHaveCount(12);
  await page.getByRole("link", { name: "Clothing", exact: true }).click();
  await expect(page.locator(".product-card")).toHaveCount(3);
});
test("search, price filters, sorting and pagination", async ({ page }) => {
  await page.goto("/shop");
  await expect(page.locator(".category-filter-card")).toHaveCount(0);
  await page.getByRole("radio", { name: "Clothing" }).click();
  await expect(page).toHaveURL(/category=Clothing/);
  await page.getByRole("radio", { name: "All products" }).click();
  await expect(page).toHaveURL("/shop");
  await expect(page.locator(".product-card")).toHaveCount(8);
  await page.getByRole("radio", { name: "Food & Groceries" }).click();
  await expect(page).toHaveURL(/category=Food.*Groceries/);
  await expect(page.locator(".product-card")).toHaveCount(3);
  await expect(page.locator(".product-name")).toContainText([
    "Pantry Essentials Selection",
    "Bulk Basmati Rice",
    "Fresh Produce Crate",
  ]);
  for (const category of [
    "Electronics",
    "Clothing",
    "Shoes",
    "Beauty & Personal Care",
    "Home & Kitchen",
    "Bags & Accessories",
    "Sports & Fitness",
    "Office & Stationery",
    "Toys & Kids",
    "Automotive",
    "Other Products",
  ]) {
    await page.getByRole("radio", { name: category }).click();
    await expect(page.locator(".product-card")).toHaveCount(3);
    await expect(page.locator(".product-name")).toHaveCount(3);
  }
  await page.getByRole("radio", { name: "All products" }).click();
  await page.getByRole("button", { name: "Page 2", exact: true }).click();
  await expect(page).toHaveURL(/page=2/);
  await page
    .getByRole("textbox", { name: "Search catalog" })
    .fill("headphones");
  await expect(page.locator(".product-card")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search catalog" })
    .fill("no product matches");
  await expect(page.getByText("No products found.")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(page).toHaveURL("/shop");
  await page.getByLabel("Sort products").selectOption("low");
  await expect(
    page.locator(".product-card").first().locator(".price"),
  ).toContainText("$2.00");
  await page.getByLabel("Max $").fill("10");
  await expect(page.locator(".product-card")).toHaveCount(8);
});
test("MOQ, persistent cart, simulated checkout and local order history", async ({
  page,
}) => {
  let realOrders = 0;
  await page.route("**/api/orders", (route) => {
    realOrders++;
    return route.abort();
  });
  await page.setViewportSize({width:390,height:844});
  await page.goto("/products/demo-0");
  const quantity = page.getByRole("spinbutton", { name: "Product quantity" });
  await expect(quantity).toHaveValue("24");
  await quantity.fill("1");
  await expect(
    page.getByRole("button", { name: "Add to Cart", exact: true }),
  ).toBeDisabled();
  await quantity.fill("25");
  await page.getByRole("button", { name: "Add to Cart", exact: true }).click();
  await page.goto("/cart");
  await expect(page.getByRole("spinbutton")).toHaveValue("25");
  await page.reload();
  await expect(page.getByRole("spinbutton")).toHaveValue("25");
  await page.getByRole("link", { name: "Continue to checkout" }).click();
  await page.getByLabel("Full name").fill("Demo Buyer");
  await expect(page.getByRole('radio',{name:'Zaad',exact:true})).toBeChecked();
  await page.getByRole('radio',{name:'eDahab',exact:true}).click();
  await expect(page.getByLabel('City / town')).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await page.getByRole("button", { name: "Place demo order" }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', {name:'Confirm demo order'})).toBeEnabled();
  await page.getByRole('button', {name:'Go back',exact:true}).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole("button", { name: "Place demo order" }).click();
  await page.getByRole('button', {name:'Confirm demo order'}).click();
  await expect(page).toHaveURL(/orders\?placed=demo/);
  await expect(
    page.getByText("Demo order created locally.", { exact: false }),
  ).toBeVisible();
  await page.locator(".order-toggle").click();
  await expect(
    page.getByText("eDahab (simulated) · No money charged"),
  ).toBeVisible();
  expect(realOrders).toBe(0);
  await page.getByText('View purchase agreement', {exact:true}).click();
  await expect(page.getByText('Version: demo-2', {exact:false})).toBeVisible();
  await expect(page.getByRole('button',{name:'Download order and agreement'})).toBeVisible();
});
test("auth connects to API and displays server validation errors", async ({
  page,
}) => {
  await page.route("**/api/auth/login", (route) =>
    route.fulfill({
      status: 401,
      json: { success: false, message: "Invalid email or password" },
    }),
  );
  await page.goto("/login");
  await page.getByLabel("Email address").fill("test@example.com");
  await page.getByLabel("Password", { exact: true }).fill("wrongpassword");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveText("Invalid email or password");
  await page.goto("/register");
  await expect(page.getByLabel("I’m here to").locator("option")).toHaveCount(2);
});
test("live catalog checkout records a simulated Zaad preference without claiming payment", async ({
  page,
}) => {
  const product = {
    _id: "abc123",
    name: "Live wholesale goods",
    price: 10,
    stockQuantity: 50,
    minimumOrderQuantity: 5,
    unit: "box",
    category: { _id: "cat1", name: "Home & Kitchen" },
    supplier: { _id: "supplier1", companyName: "Live Supplier" },
    images: ["/catalog/photo-1514228742587-6b1558fcca3d.jpg"],
  };
  const buyer = {
    _id: "buyer1",
    name: "Live Test",
    email: "test@example.com",
    role: "buyer",
  };
  let payload;
  await page.addInitScript(() =>
    sessionStorage.setItem("p2p-token", "test-token"),
  );
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me")
      return route.fulfill({ json: { success: true, data: buyer } });
    if (path === '/api/orders/agreement') return route.fulfill({json:{success:true,data:{version:'test-1',text:'I confirm the reviewed order and Cash on Delivery total.'}}});
    if (path === '/api/products/abc123') return route.fulfill({json:{success:true,data:product}});
    if (path === "/api/products")
      return route.fulfill({
        json: {
          success: true,
          data: { items: [product], pagination: { pages: 1 } },
        },
      });
    if (path === "/api/categories")
      return route.fulfill({
        json: { success: true, data: [product.category] },
      });
    if (path === "/api/orders" && route.request().method() === "POST") {
      payload = route.request().postDataJSON();
      return route.fulfill({
        status: 201,
        json: { success: true, data: { _id: "order1" } },
      });
    }
    if (path === "/api/orders/my-orders")
      return route.fulfill({ json: { success: true, data: { items: [] } } });
    return route.abort();
  });
  await page.goto("/products/abc123");
  await page.getByRole("button", { name: "Add to Cart", exact: true }).click();
  await page.goto("/checkout");
  await page.getByLabel("Phone number").fill("0700000000");
  await page.getByLabel("Location (optional)").fill("Test shop");

  await page
    .getByRole("button", { name: "Review order" })
    .click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(
    page.getByText("I confirm the reviewed order and Cash on Delivery total."),
  ).toBeVisible();
  await expect(page.getByText("Agreement version: test-1")).toBeVisible();
  expect(payload).toBeUndefined();
  await expect(page.getByRole('button',{name:'Agree and confirm purchase'})).toBeDisabled();
  await page.getByRole('dialog').getByRole('checkbox').check();
  await page.getByRole('button',{name:'Agree and confirm purchase'}).click();
  await expect(page).toHaveURL(/orders\?placed=live/);
  expect(payload.items).toEqual([{ product: "abc123", quantity: 5 }]);
  expect(payload.paymentMethod).toBe("zaad_demo");
  expect(Object.keys(payload).sort()).toEqual([
    "agreement",
    "deliveryAddress",
    "expectedTotal",
    "items",
    "paymentMethod",
  ]);
  expect(payload.agreement).toEqual({accepted:true,version:'test-1'});
  expect(payload.expectedTotal).toBe(50);
});
test("supplier and admin previews are labeled and do not issue writes", async ({
  page,
}) => {
  let writes = 0;
  await page.route("**/api/**", (route) => {
    if (route.request().method() !== "GET") writes++;
    return route.abort();
  });
  await page.goto("/supplier/dashboard");
  await expect(page.locator(".demo-bar")).toHaveCount(0);
  await expect(page.locator(".supplier-stat-card")).toHaveCount(3);
  await expect(page.locator(".supplier-welcome")).toBeVisible();
  await expect(
    page.getByText("Read-only dashboard preview.", { exact: false }),
  ).toBeVisible();
  await page.getByRole("button", { name: "My products", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(6);
  await page.getByRole("button", { name: "Add product", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "New wholesale product" }),
  ).toBeVisible();
  await page.goto("/admin/dashboard");
  await expect(page.locator(".demo-bar")).toHaveCount(0);
  await expect(page.locator(".admin-dashboard .dashboard-sidebar .brand")).toHaveCount(0);
  await expect(page.locator(".admin-stat-card")).toHaveCount(3);
  await page.getByRole("button", { name: "Users", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Manage marketplace users" }),
  ).toBeVisible();
  await expect(page.getByRole("searchbox", { name: "Search users" })).toHaveCount(0);
  await expect(page.locator(".admin-user-stat")).toHaveCount(3);
  await expect(page.getByText(/Showing \d+ users?/)).toHaveCount(0);
  await expect(page.getByText("No users to display")).toBeVisible();
  await page.getByRole("button", { name: "Suppliers", exact: true }).click();
  await page
    .getByRole("button", { name: "Approve", exact: false })
    .first()
    .click();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "This is a dashboard preview." }),
  ).toBeVisible();
  expect(writes).toBe(0);
});
test("supplier dashboard flags incoming pending orders", async ({ page }) => {
  await page.addInitScript(() =>
    sessionStorage.setItem("p2p-token", "supplier-test-token"),
  );
  const supplierOrder = {
    _id: "65a100000000000000000001",
    orderStatus: "pending",
    totalAmount: 60,
    deliveryAddress: "Test shop",
    items: [
      {
        _id: "65a100000000000000000002",
        productName: "Wholesale Rice",
        quantity: 5,
        unitPrice: 12,
        fulfillmentStatus: "pending",
      },
    ],
    supplierAmounts: {
      grossAmount: 60,
      commissionAmount: 1,
      supplierNetAmount: 59,
    },
  };
  await page.route("**/api/**", (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === "/api/auth/me") {
      return route.fulfill({
        json: {
          success: true,
          data: { _id: "supplier-1", name: "Shop Owner", role: "supplier" },
        },
      });
    }
    if (path === "/api/suppliers/me") {
      return route.fulfill({
        json: {
          success: true,
          data: {
            _id: "shop-1",
            companyName: "Test Shop",
            verificationStatus: "approved",
          },
        },
      });
    }
    if (path === "/api/suppliers/me/products") {
      return route.fulfill({ json: { success: true, data: { items: [] } } });
    }
    if (path === "/api/suppliers/me/orders") {
      return route.fulfill({
        json: {
          success: true,
          data: { items: [supplierOrder], pagination: { total: 1 } },
        },
      });
    }
    if (path === "/api/categories") {
      return route.fulfill({ json: { success: true, data: [] } });
    }
    return route.abort();
  });
  await page.goto("/supplier/dashboard");
  await expect(page.getByText("Orders need attention")).toBeVisible();
  await expect(page.getByText("You have 1 pending order to review.")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Incoming orders", exact: true }),
  ).toContainText("1");
  await page.getByRole("button", { name: "View incoming orders" }).click();
  await expect(
    page.getByRole("heading", { name: "Order #00000001" }),
  ).toBeVisible();
});
test("buyer order history shows styled progress and expandable details", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      "p2p-demo-orders",
      JSON.stringify([
        {
          _id: "demo-order-1234abcd",
          isDemo: true,
          createdAt: "2026-10-22T07:00:00.000Z",
          orderStatus: "processing",
          totalAmount: 60,
          deliveryAddress: "Test shop",
          paymentMethod: "cash_on_delivery",
          paymentStatus: "pending",
          items: [
            {
              _id: "demo-item-1",
              productName: "Wholesale Rice",
              supplierName: "Harvest Supplier",
              quantity: 5,
              unitPrice: 12,
              subtotal: 60,
              fulfillmentStatus: "processing",
            },
          ],
        },
      ]),
    );
  });
  await page.goto("/orders");
  const orderCard = page.locator(".buyer-order-card");
  await expect(orderCard).toHaveCount(1);
  await expect(orderCard.locator(".buyer-order-number")).toContainText(
    "1234ABCD",
  );
  await expect(orderCard.locator(".buyer-order-progress .complete")).toHaveCount(
    2,
  );
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const cardFits = await orderCard.evaluate(
      (card) => card.getBoundingClientRect().right <= innerWidth,
    );
    expect(cardFits).toBeTruthy();
  }
  await orderCard.getByRole("button", { name: /Demo order/ }).click();
  await expect(
    orderCard.getByText("Harvest Supplier", { exact: false }),
  ).toBeVisible();
});
test("responsive routes have no horizontal overflow at mobile, tablet and desktop sizes", async ({
  page,
}) => {
  test.setTimeout(120000);
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const path of [
      "/",
      "/shop",
      "/categories",
      "/suppliers",
      "/products/demo-0",
      "/cart",
      "/orders",
      "/login",
      "/register",
      "/supplier/dashboard",
      "/admin/dashboard",
    ]) {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBeTruthy();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({
    path: "test-results/home-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Toggle menu" }).click();
  await page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Shop", exact: true })
    .click();
  await expect(page).toHaveURL("/shop");
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Clothing", { exact: true }).click();
  await expect(page.getByLabel("Clothing", { exact: true })).toBeChecked();
  await expect(page.locator(".product-card")).toHaveCount(3);
});
