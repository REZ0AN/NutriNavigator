# NutriNavigator Frontend

The frontend is a React and Redux application. It owns presentation and
browser state, but never decides authoritative prices, stock, permissions, or
payment status.

## Local setup

```bash
cd frontend
cp .env.example .env
npm install
npm start
```

The development server runs at `http://localhost:3000`.

Development API requests use the proxy configured in `package.json`. In the
Docker image, Nginx serves the production build on port `80` and proxies
`/api/` to `http://backend:8080`.

The frontend does not need the Gemini key, recommendation-service secret,
Stripe secret key, or any other server secret. A publishable Stripe key may be
returned by the backend when the payment page is opened.

## Tests and build

```bash
npm test -- --watchAll=false
npm run build
```

## Current style and layout

This section describes the UI as implemented during the progressive redesign.
The shared Tailwind theme is in [`tailwind.config.js`](tailwind.config.js).
Legacy screens still use [`src/styles/tokens.css`](src/styles/tokens.css),
[`src/styles/reset.css`](src/styles/reset.css), and CSS next to each component.
`src/index.js` loads both styling systems; Tailwind's preflight reset is
disabled so existing screens keep their element defaults. `src/App.jsx`
selects the storefront or admin shell by route.

### Visual language

| Element | Current treatment |
| --- | --- |
| Brand | Migrated storefront areas use forest green (`brand.900`, `#173525`) and softer leaf tones. Legacy pages retain their existing forest and mint tokens. |
| Surfaces | Migrated storefront areas use cream (`#F8F6F0`) and warm white (`#FFFEFA`). Legacy pages retain their pale green backgrounds and cards. |
| Text | Near-black body text with softer gray for supporting copy; green headings and prices. |
| Type | DM Serif Display for headings; Outfit for body text, labels, controls, and most admin headings. Both load from Google Fonts, with local fallbacks. |
| Spacing and shape | An 8-point-based spacing token scale, rounded cards (typically 20–28px), pill buttons and badges, and light shadows. |
| Feedback | Green, red, amber, and blue semantic colors for status, errors, warnings, and information. |

Migrated controls use `src/components/ui/Button.jsx` variants. Legacy screens
still use the global `.btn` variants from `reset.css`. The two systems coexist
until each screen is migrated and checked.

### Page shells

- **Storefront:** A 68px sticky forest header contains the logo, Home,
  Products, and Get Dietary links, plus search, cart, and account actions.
  The cart count appears as a mint badge. At 768px and below, the navigation
  links move into a menu opened by the header button. Storefront pages end
  with a warm white footer: brand copy, Explore and Account links, social
  links, and a copyright row. The header and footer are omitted on `/admin/*`.
- **Admin:** `AdminLayout` uses a 248px forest sidebar and a pale green main
  area. The sidebar stays at the top of the viewport, fills its height, and
  scrolls vertically. The main area has shared white table and form-card
  styles; wide tables scroll horizontally. At 768px and below, main padding
  shrinks. The sidebar does not currently switch to a mobile drawer.
- **Content width:** Most storefront content is centered within the
  `--content-max` value of 1200px, with page-specific horizontal padding.

### Main screen compositions

| Screen | Layout |
| --- | --- |
| Home | Full-width photographic hero with a dark overlay, left-aligned headline and actions on desktop; featured product grid on a warm cream background; full-width forest dietary recommendation callout. Hero copy and actions center on narrow screens. |
| Products and detail | Catalog has a 256px sticky filter column and an auto-filling product grid. Product cards use square, edge-to-edge cover images above rating, price, and action. Detail has a two-column gallery and information area, followed by a responsive review grid. |
| Search and recommendation | Search has its own page styles. The dietary page has a photographic hero with a white form card overlapping it, then a grid of food result cards. |
| Account | Login and related authentication screens use a background photo with a dark overlay and a centered white card. Profile pages use their own card layout. |
| Cart and checkout | Cart items sit beside a sticky 340px summary. The confirmation page has a similar two-column layout with a 320px summary. Shipping and payment use centered cards; checkout steps show the active and completed stage. |
| Orders and admin | Customer orders use a horizontally scrollable table and detail cards. The admin dashboard uses statistic cards, interactive charts, and shared tables; other admin pages use the same sidebar and form/table styles. |

### Responsive behavior

Breakpoints are defined by each component rather than one global media-query
scale. The header menu and product detail columns change at 768px; catalog
filters move above the product grid at 900px and become two columns at 600px;
the cart and confirmation summaries stack below the main content at 860px
and 768px respectively. The footer changes from four columns to two at 900px
and one at 480px. Dashboard charts stack at 1100px, while statistic cards
change from four to two columns at 1024px. Narrow screens retain horizontal
scrolling for data tables.

### Where to edit

- Migrated storefront theme colors, fonts, and layout values:
  [`tailwind.config.js`](tailwind.config.js).
- Legacy global colors, fonts, spacing, radius, shadows, and layout constants:
  [`src/styles/tokens.css`](src/styles/tokens.css).
- Base element rules and shared buttons:
  [`src/styles/reset.css`](src/styles/reset.css).
- Storefront chrome: `src/components/layouts/Header/` and
  `src/components/layouts/Footer/`.
- Admin shell and shared admin controls: `src/components/Admin/AdminLayout.css`
  and `src/components/Admin/Sidebar/`.
- Screen-specific layout: the `.css` file beside each page component.

### Redesign progress

The home page, shared product card, storefront header, and footer now use
Tailwind utilities. `Button` and `Container` are the first shared presentation
components. Their former CSS files remain in the repository for comparison
until the migrated screens receive visual checks at desktop, tablet, and mobile
sizes. Catalog, product detail, checkout, account, orders, recommendation, and
admin screens still use their existing CSS and behavior.

## Use cases and user flows

These flows describe the current browser UI. The backend remains authoritative
for access, catalog data, prices, stock, payment, and order state. A `user`
account can use buyer features; `admin` and `master` accounts can enter the
admin routes. Protected routes send signed-out visitors to `/error/401`, and
admin routes send signed-in users without an admin role to `/error/403`.

### Buyer use cases

| Goal | Entry point and flow | Result |
| --- | --- | --- |
| Discover products | Start on `/`, browse featured products, open `/products`, or search at `/search`. On the catalog page, change category, price, rating, or page. | Open a product at `/product/:id` to see images, description, stock, and reviews. |
| Get food recommendations | Sign in, open `/dietrecommend`, enter personal details and health conditions, then submit. | See food names and reasons. Results matched to a catalog product link to its detail page; unmatched results say they are unavailable to buy here. |
| Create or access an account | Use the Sign Up or Sign In tabs at `/login`. Registration sends a verification email; verify through `/verify-email/:token` before signing in. | Access profile, checkout, and orders. Forgot password and resend verification links provide recovery paths. |
| Manage profile | From `/profile`, open `/profile/update` or `/password/update`. | Save account details or change the password, then return to the profile. |
| Review a product | On `/product/:id`, choose **Write a Review**, set a rating and comment, then submit. | The product review list reloads after a successful submission; the server decides whether the write is allowed. |
| Track an order | Open `/orders/me`, then select an order at `/order/:id`. | See items, shipping information, payment state, amount, and order status. |

**Buyer checkout flow**

1. Open a product, select a quantity within the displayed stock, and add it
   to the cart. On `/cart`, adjust quantities or remove items.
2. Select **Proceed to Checkout**. The button opens
   `/login?redirect=/shipping`; a signed-in buyer continues to the protected
   shipping page.
3. Enter an address, city, PIN code, 11-digit phone number, country, and
   state on `/shipping`. Continue to `/order/confirm` to review shipping,
   items, and the displayed cost breakdown.
4. Select **Proceed to Payment**, enter card details on `/process/payment`,
   and submit. The browser requests a PaymentIntent, confirms the card with
   Stripe, and then requests order creation. The backend recalculates the
   authoritative amount from catalog data.
5. After order creation succeeds, the cart clears and `/success` offers
   **View My Orders** or **Continue Shopping**. If payment or order creation
   fails, the payment page shows an error instead of navigating to success.

### Admin use cases

| Goal | Entry point and flow | Result |
| --- | --- | --- |
| Monitor the store | Open `/admin/dashboard`. Inspect all-time summary cards, a selected-range order-value and order-count summary, order-value and status charts, recent orders, stock levels, and any out-of-stock alert. Select a UTC date preset or custom range, group the line chart daily, weekly, or monthly, and use **Export Delivered** for the selected range. | A dashboard view of current activity and an order export when requested. |
| Manage catalog | Open `/admin/products`. Create a product at `/admin/product`, or open `/admin/product/:id` to edit its name, description, price, category, stock, and images. Delete from the list. | Product changes appear in the catalog after a successful server response. |
| Process orders | Open `/admin/orders`, move between list pages, and select an order at `/admin/order/:id`. Review payment, shipping, and items before updating status. | The UI offers `processing → shipped → delivered`, one step at a time. Delivered orders have no further status form. The list also exposes a delete action. |
| Manage users | Open `/admin/users`, then `/admin/user/:id` to edit name, email, or role; the list also exposes deletion. | Updated account details or role are saved after the server accepts the request. |
| Moderate reviews | Open `/admin/reviews`, search by product, reviewer, or comment, filter by rating, sort, and load more results. Select delete and confirm in the dialog. | The review disappears after the server deletes it and recalculates the product rating. |

**Admin order flow**

1. Open `/admin/orders` from the sidebar and choose an order.
2. On `/admin/order/:id`, review shipping, payment, items, and current status.
3. Select the next available status and submit. The page returns to the order
   list after a successful update; a delivered order has no update form.

The sidebar links to the dashboard, products, orders, users, and reviews. The
frontend guard restricts the admin routes; each backend endpoint enforces its
own authorization.

Dashboard date filters use UTC calendar days and include both endpoints. The
selected-range order value sums the total price of all orders created in that
range, regardless of payment or delivery status. It is an order-value measure,
not settled revenue. The all-time cards are labeled separately. The export
contains delivered orders selected by delivery date, so its contents can differ
from the created-order charts for the same dates.
