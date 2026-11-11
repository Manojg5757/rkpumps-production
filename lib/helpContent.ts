export type HelpTopic = {
  id: string;
  title: string;
  summary: string;
  steps: string[];
  tips?: string[];
  action?: { label: string; href: string };
};

export type HelpSection = { id: string; title: string; topics: HelpTopic[] };

export const HELP: HelpSection[] = [
  {
    id: 'start',
    title: 'First-time setup',
    topics: [
      {
        id: 'settings',
        title: 'Add your business details and GSTIN',
        summary: 'These print on every invoice and quotation.',
        steps: [
          'Open the menu → Settings.',
          'Enter your business name, address and phone.',
          'Type your GSTIN — your state is picked automatically from its first two digits.',
          'Add bank details and your UPI ID so customers can pay from the invoice.',
          'Tap Save settings.',
        ],
        tips: ['Without a GSTIN, invoices print as “INVOICE”, not “TAX INVOICE”.'],
        action: { label: 'Open Settings', href: '/settings' },
      },
      {
        id: 'import',
        title: 'Load your products from Excel',
        summary: 'Bring in all your pumps, pipes, fittings and services at once.',
        steps: [
          'Fill your sheet: Item Name, Category, HSN/SAC, GST %, Unit, Sale Rate, Purchase Rate, Opening Stock.',
          'Mark labour rows with Type = “Service” — they never need stock.',
          'Go to Inventory → Import and choose the .xlsx or .csv file.',
          'Check the preview: new items, updated items and any rows with problems.',
          'Tap Import. Running the same file again updates prices instead of making duplicates.',
        ],
        tips: [
          'If the Sale Rate header says “incl GST”, the price is treated as what the customer pays.',
          'Opening stock is recorded as a Stock-in entry, so it shows in the stock register.',
        ],
        action: { label: 'Open Inventory', href: '/inventory' },
      },
      {
        id: 'add-product',
        title: 'Add or edit one product',
        summary: 'For new items you start selling.',
        steps: [
          'Inventory → Add product.',
          'Enter name, category, unit and HSN code.',
          'Enter purchase price, GST rate and selling price. Switch to “Incl. GST” to type the price the customer pays.',
          'Tick “Service / labour” for charges like pump lowering — these are billed without stock.',
          'Save. To change it later, tap the product → Edit.',
        ],
        action: { label: 'Open Inventory', href: '/inventory' },
      },
      {
        id: 'install',
        title: 'Install the app on your phone',
        summary: 'Open it from the home screen like any other app.',
        steps: [
          'Open the website in Chrome on your phone and log in.',
          'Tap the ⋮ menu → “Add to Home screen” (or “Install app”).',
          'Open RK Billing from your home screen.',
        ],
      },
    ],
  },
  {
    id: 'daily',
    title: 'Daily work',
    topics: [
      {
        id: 'invoice',
        title: 'Make a GST invoice',
        summary: 'Bill a customer and share the PDF on WhatsApp.',
        steps: [
          'Tap the + button → New invoice.',
          'Type the customer’s phone or name. Existing customers appear — tap to select. New customers are saved automatically.',
          'Tap Add items, search and tap products. Tap an item again to add one more.',
          'Tap an item in the bill to change quantity, rate or discount.',
          'Choose Paid in full, Part paid or Credit.',
          'Tap Save invoice, then Share on WhatsApp, Download or Print.',
        ],
        tips: [
          'Quantities can be decimals — 12.5 metres of pipe or cable.',
          'A customer GSTIN from another state switches the bill to IGST automatically.',
          'If the phone locks mid-bill, the unsaved invoice is restored when you come back.',
        ],
        action: { label: 'New invoice', href: '/billing' },
      },
      {
        id: 'labour',
        title: 'Add labour or service charges to a bill',
        summary: 'Installation, lowering, drilling per foot, rewinding.',
        steps: [
          'On the invoice, search for the service (e.g. “drilling”) if you imported it — set the quantity in feet or jobs.',
          'Or tap Labour, pick a description such as “Pump installation”, and type the amount.',
          'Choose whether the amount includes GST and check the GST rate (usually 18%).',
        ],
        action: { label: 'New invoice', href: '/billing' },
      },
      {
        id: 'payment',
        title: 'Receive a pending payment',
        summary: 'Record money collected later against an invoice.',
        steps: [
          'Tap + → Receive payment (or open Customers → With dues).',
          'Tap the customer, then Receive next to the unpaid invoice.',
          'Enter the amount and payment mode, then Save payment.',
        ],
        tips: ['Use Remind to send the customer a polite WhatsApp message with the amount due and your UPI ID.'],
        action: { label: 'Customers with dues', href: '/customers?filter=pending' },
      },
      {
        id: 'quotation',
        title: 'Send a quotation and turn it into an invoice',
        summary: 'Quote the full borewell job, bill it when confirmed.',
        steps: [
          'Tap + → New quotation.',
          'Add the customer, items and labour. Prices shown include GST.',
          'Choose validity (7, 15 or 30 days), add notes such as bore depth, and Save quotation.',
          'Share it on WhatsApp.',
          'When the customer agrees: Quotations → Saved quotations → open it → Convert to invoice.',
        ],
        action: { label: 'Quotations', href: '/quotation' },
      },
      {
        id: 'stock-in',
        title: 'Record stock you bought',
        summary: 'Keeps stock counts and profit correct.',
        steps: [
          'Tap + → Stock in (or Inventory → Stock in).',
          'Choose the product and enter the quantity.',
          'Optionally update the purchase price, selling price, supplier and supplier bill number.',
          'Use Stock out for damaged items or returns to the supplier.',
        ],
        action: { label: 'Open Inventory', href: '/inventory' },
      },
      {
        id: 'expense',
        title: 'Record an expense',
        summary: 'Fuel, transport, labour, rent — so net profit is real.',
        steps: ['Tap + → Add expense.', 'Pick a category, enter what it was for and the amount.', 'Change the date if it was on another day, then Save expense.'],
        action: { label: 'Add expense', href: '/expenses?action=add' },
      },
    ],
  },
  {
    id: 'month',
    title: 'Month end',
    topics: [
      {
        id: 'gst',
        title: 'GST summary for filing',
        summary: 'Totals your accountant needs for GSTR-1 and GSTR-3B.',
        steps: [
          'Open Reports → GST summary.',
          'Choose Last month.',
          'Check taxable value, CGST, SGST and IGST, and the rate-wise and HSN-wise tables.',
          'Tap Invoices and HSN to download CSV files and send them to your accountant.',
        ],
        action: { label: 'Open Reports', href: '/reports' },
      },
      {
        id: 'profit',
        title: 'Check your profit',
        summary: 'Did the business actually make money?',
        steps: [
          'The Dashboard shows today’s and this month’s profit after expenses.',
          'Reports → Profit & loss shows the last 12 months side by side.',
          'Dashboard → “Not selling” shows items with no sale in 30/60/90 days and the money locked in them.',
        ],
        action: { label: 'Open Reports', href: '/reports?tab=profit' },
      },
      {
        id: 'backup',
        title: 'Back up your data',
        summary: 'Keep a copy of everything once a month.',
        steps: ['Settings → Download backup.', 'Save the file to Google Drive or email it to yourself.'],
        action: { label: 'Open Settings', href: '/settings' },
      },
    ],
  },
  {
    id: 'problems',
    title: 'Fixing common problems',
    topics: [
      {
        id: 'cant-load',
        title: '“Could not load” or “Missing or insufficient permissions”',
        summary: 'The database is refusing access.',
        steps: [
          'Check your internet connection and reload.',
          'If the message says “permissions”, the Firestore security rules have expired or don’t include your login email.',
          'Firebase console → Firestore Database → Rules: allow read and write for your login email, then Publish.',
        ],
      },
      {
        id: 'out-of-stock',
        title: 'I can’t add an item to the invoice',
        summary: 'The item shows “Out of stock”.',
        steps: [
          'Record the stock you have: + → Stock in.',
          'If it is labour or a service, edit the product and tick “Service / labour (no stock)”.',
        ],
      },
      {
        id: 'whatsapp',
        title: 'WhatsApp share has no PDF attached',
        summary: 'Happens on computers.',
        steps: [
          'On a phone, Share opens the share sheet with the PDF attached — choose WhatsApp.',
          'On a computer, WhatsApp opens with the message and the PDF downloads — attach the downloaded file in WhatsApp.',
        ],
      },
      {
        id: 'wrong-invoice',
        title: 'I made a mistake on a saved invoice',
        summary: 'Saved GST invoices are never edited.',
        steps: [
          'Invoice totals are locked after saving, as GST rules require.',
          'Payments can still be added at any time.',
          'For a wrong bill, ask your accountant about issuing a credit note, then create a fresh invoice.',
        ],
      },
    ],
  },
];

/** Page → most relevant help topic (used by the “?” link on each page). */
export const PAGE_HELP: Record<string, string> = {
  '/': 'profit',
  '/billing': 'invoice',
  '/sales': 'payment',
  '/quotation': 'quotation',
  '/customers': 'payment',
  '/inventory': 'import',
  '/suppliers': 'stock-in',
  '/expenses': 'expense',
  '/reports': 'gst',
  '/settings': 'settings',
};
