// index.js
import 'dotenv/config';
import { Shopify } from '@shopify/shopify-api';
import puppeteer from 'puppeteer';
import { google } from 'googleapis';
import { DateTime } from 'luxon';

// ------------- ENV -----------------
const {
  SHOP_DOMAIN,
  SHOP_API_KEY,
  SHOP_API_PASSWORD,
  CANVA_EMAIL,
  CANVA_PASS,
  SHEET_ID,
  GOOGLE_SERVICE_KEY_JSON
} = process.env;

// ------------- SHOPIFY -------------
const shopify = new Shopify({
  apiKey:    SHOP_API_KEY,
  password:  SHOP_API_PASSWORD,
  shopDomain: SHOP_DOMAIN.replace(/^https?:\/\//, ''),
  apiVersion: '2024-04'
});

async function getOrders() {
  return shopify.rest.Order.all({ status: 'any', limit: 5 });
}

// ------------- GOOGLE SHEETS -------
const sheets = google.sheets({
  version: 'v4',
  auth: new google.auth.GoogleAuth({
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    keyFile: GOOGLE_SERVICE_KEY_JSON
  })
});

async function appendRow(values) {
  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Orders!A1',
    valueInputOption: 'RAW',
    requestBody: { values: [values] }
  });
}

// ------------- CANVA (optional) ----
async function duplicateTemplate(orderName) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.goto('https://www.canva.com/login');
  await page.type('input[type=email]', CANVA_EMAIL);
  await page.type('input[type=password]', CANVA_PASS);
  await page.click('button[type=submit]');
  await page.waitForNavigation();

  // navigate to your template & duplicate (simplified)
  await page.goto('https://www.canva.com/design/your-template-id');
  await page.click('button:has-text("Duplicate")');
  await page.waitForTimeout(4000);
  await page.keyboard.type(orderName);
  await browser.close();
}

// ------------- MAIN ----------------
(async () => {
  const orders = await getOrders();
  for (const o of orders) {
    const row = [
      o.name,
      DateTime.fromISO(o.created_at).toISODate(),
      o.total_price,
      o.email
    ];
    await appendRow(row);

    // optional duplicate
    // await duplicateTemplate(o.name);
  }
  console.log('Done.');
})();
