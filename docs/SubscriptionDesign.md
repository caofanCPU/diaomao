# Subscription and Credits System Design

## 1. Overview

This document outlines a comprehensive design for a subscription and credits system integrated with Stripe for payment processing. The system aims to provide a seamless user experience for subscribing to services, managing credits, and handling payments while ensuring scalability, security, and maintainability. The design addresses user operations, data models, and data flows, improving upon the initial draft by adding clarity, professionalism, and robustness.

---

## 2. Objectives

- Enable users to subscribe to plans or purchase one-time credit packages via Stripe.
- Provide a user-friendly interface for managing subscriptions and viewing credit balances.
- Ensure secure identification of users, including anonymous ones, using Fingerprint.
- Support flexible subscription management (auto-renewal, cancellation, upgrades, add-ons).
- Maintain detailed transaction and credit usage history.
- Design scalable data models and clear data flows for reliability and performance.

---

## 3. User Operation Scenarios

### 3.1 User Registration and Identification
- **Anonymous Users**: Identified using Fingerprint (a device-based identifier) to prevent abuse (e.g., excessive free credit usage).
- **Registered Users**: Users can sign up with email and password or use SSO (e.g., Google, Apple). Registered users are assigned a unique `user_id`.
- **Scenario**:
  - A new user visits the platform and is assigned a Fingerprint ID.
  - They can use limited free credits without registering.
  - To access paid features, they must register or log in, linking their Fingerprint ID to a `user_id`.

### 3.2 Subscription Management
- **Subscription Plans**: Users can choose from multiple plans (e.g., Basic, Pro, Enterprise) with different credit allocations and pricing.
- **Actions**:
  - **Subscribe**: Users select a plan and are redirected to Stripe’s checkout page for payment.
  - **Auto-Renewal**: Subscriptions renew automatically unless canceled.
  - **Upgrade/Downgrade**: Users can switch plans, with proration handled by Stripe.
  - **Cancellation**: Users can cancel subscriptions, effective at the end of the billing cycle.
  - **Add-Ons**: Users can purchase additional credit packages without changing their plan.
- **Scenario**:
  - A user selects the Pro plan, completes payment via Stripe, and receives monthly credits.
  - Midway through the cycle, they purchase an add-on credit package for additional usage.
  - They later upgrade to the Enterprise plan, with Stripe handling proration.

### 3.3 Credit Usage
- **Credit System**: Credits are used for accessing premium features (e.g., API calls, advanced tools).
- **Free vs. Paid Credits**:
  - Free credits are provided to new users (limited by Fingerprint to prevent abuse).
  - Paid credits are allocated based on subscription plans or one-time purchases.
- **Scenario**:
  - A user consumes credits for API requests.
  - The system deducts credits from their balance, prioritizing paid credits over free ones.
  - If credits are depleted, the user is prompted to purchase more or upgrade their plan.

### 3.4 History and Reporting
- **Transaction History**: Users can view past payments, including invoices and receipts.
- **Credit Usage History**: Users can see a detailed log of credit usage (e.g., feature used, timestamp, credits spent).
- **Scenario**:
  - A user navigates to the history page to review their last three months of credit usage and payment records.

### 3.5 Refunds and Disputes
- **Refund Process**: Users can request refunds for eligible transactions (e.g., within 7 days).
- **Scenario**:
  - A user requests a refund for a one-time credit purchase. The system processes the refund via Stripe and updates the credit balance.

---

## 4. Data Model Design

### 4.1 Core Data Tables

#### Users
Stores user information, including anonymous users identified by Fingerprint.

| Column Name         | Type         | Description                              |
|---------------------|--------------|------------------------------------------|
| `user_id`           | UUID         | Primary key, unique user identifier      |
| `fingerprint_id`    | String       | Fingerprint identifier for anonymous users |
| `email`             | String       | User email (nullable for anonymous users) |
| `created_at`        | Timestamp    | Account creation timestamp              |
| `updated_at`        | Timestamp    | Last update timestamp                   |

#### Subscriptions
Tracks active subscriptions and their details.

| Column Name         | Type         | Description                              |
|---------------------|--------------|------------------------------------------|
| `subscription_id`   | UUID         | Primary key, unique subscription ID      |
| `user_id`           | UUID         | Foreign key referencing `Users`          |
| `stripe_subscription_id` | String   | Stripe subscription ID (sub_xxx)        |
| `plan_id`           | String       | Plan identifier (e.g., basic, pro)       |
| `status`            | Enum         | Active, canceled, past_due, etc.        |
| `credits_allocated` | Integer      | Credits allocated per billing cycle      |
| `start_date`        | Timestamp    | Subscription start date                 |
| `end_date`          | Timestamp    | Subscription end date (nullable)        |
| `created_at`        | Timestamp    | Record creation timestamp               |
| `updated_at`        | Timestamp    | Last update timestamp                   |

#### Credits
Manages user credit balances.

| Column Name         | Type         | Description                              |
|---------------------|--------------|------------------------------------------|
| `credit_id`         | UUID         | Primary key, unique credit record ID     |
| `user_id`           | UUID         | Foreign key referencing `Users`          |
| `balance_free`      | Integer      | Free credit balance                     |
| `balance_paid`      | Integer      | Paid credit balance                     |
| `created_at`        | Timestamp    | Record creation timestamp               |
| `updated_at`        | Timestamp    | Last update timestamp                   |

#### Transactions
Records payment transactions, including subscriptions and one-time purchases.

| Column Name         | Type         | Description                              |
|---------------------|--------------|------------------------------------------|
| `transaction_id`    | UUID         | Primary key, unique transaction ID       |
| `user_id`           | UUID         | Foreign key referencing `Users`          |
| `stripe_session_id` | String       | Stripe Checkout Session ID (cs_xxx)      |
| `stripe_invoice_id` | String       | Stripe Invoice ID (in_xxx)              |
| `amount`            | Integer      | Payment amount (in cents)               |
| `currency`          | String       | Currency code (e.g., USD, CNY)          |
| `status`            | Enum         | Paid, refunded, canceled, failed         |
| `type`              | Enum         | Subscription, one-time                   |
| `credits_granted`   | Integer      | Credits granted from this transaction    |
| `created_at`        | Timestamp    | Transaction creation timestamp           |
| `updated_at`        | Timestamp    | Last update timestamp                   |

#### Credit Usage
Tracks how credits are consumed.

| Column Name         | Type         | Description                              |
|---------------------|--------------|------------------------------------------|
| `usage_id`          | UUID         | Primary key, unique usage record ID      |
| `user_id`           | UUID         | Foreign key referencing `Users`          |
| `feature`           | String       | Feature used (e.g., API call, tool)      |
| `credits_used`      | Integer      | Number of credits consumed               |
| `created_at`        | Timestamp    | Usage timestamp                         |

### 4.2 Indexes
- **Users**: Primary key (`user_id`), unique index on `fingerprint_id`, index on `email`.
- **Subscriptions**: Primary key (`subscription_id`), index on `user_id`, `stripe_subscription_id`.
- **Credits**: Primary key (`credit_id`), index on `user_id`.
- **Transactions**: Primary key (`transaction_id`), indexes on `user_id`, `stripe_session_id`, `stripe_invoice_id`.
- **Credit Usage**: Primary key (`usage_id`), index on `user_id`, `created_at`.

---

## 5. Data Flow Design

### 5.1 Subscription Purchase Flow
1. **User Initiates Subscription**:
   - User selects a plan on the subscription management interface.
   - Frontend sends a request to the backend with the `plan_id` and `user_id` (or `fingerprint_id` for anonymous users).
2. **Stripe Session Creation**:
   - Backend creates a Stripe Checkout Session (`stripe_session_id`) for the selected plan.
   - User is redirected to Stripe’s checkout page.
3. **Payment Completion**:
   - Upon successful payment, Stripe sends a webhook (`checkout.session.completed`) to the backend.
   - Backend updates the `Subscriptions` table with the new subscription details and allocates credits to the `Credits` table.
   - A record is created in the `Transactions` table with the `stripe_session_id`, `amount`, and `credits_granted`.
4. **User Notification**:
   - User receives a confirmation email and sees updated credit balance on the interface.

### 5.2 Credit Usage Flow
1. **Feature Access**:
   - User attempts to access a premium feature.
   - Backend checks the `Credits` table for sufficient `balance_paid` or `balance_free`.
2. **Credit Deduction**:
   - If sufficient credits are available, deduct from `balance_paid` first, then `balance_free`.
   - Record the usage in the `Credit Usage` table with `feature` and `credits_used`.
3. **Insufficient Credits**:
   - Prompt the user to purchase more credits or upgrade their plan.

### 5.3 Subscription Management Flow
- **Auto-Renewal**:
  - Stripe handles auto-renewal and sends a webhook (`invoice.paid`) to the backend.
  - Backend updates the `Subscriptions` table and adds credits to the `Credits` table.
- **Cancellation**:
  - User cancels via the subscription management interface.
  - Backend sends a cancellation request to Stripe and updates the `Subscriptions` table (`status` = canceled).
- **Upgrade/Downgrade**:
  - User selects a new plan; backend updates the Stripe subscription and prorates the cost.
  - Update the `Subscriptions` table with the new `plan_id` and `credits_allocated`.
- **Add-On Purchase**:
  - Similar to subscription purchase, but creates a one-time Stripe Checkout Session.
  - Credits are added to the `Credits` table upon webhook confirmation.

### 5.4 Refund Flow
1. **User Requests Refund**:
   - User initiates a refund request via the interface.
   - Backend verifies eligibility (e.g., within 7 days, based on `Transactions` table).
2. **Process Refund**:
   - Backend sends a refund request to Stripe using the `stripe_session_id`.
   - Stripe processes the refund and sends a webhook (`charge.refunded`).
   - Backend updates the `Transactions` table (`status` = refunded) and deducts credits from the `Credits` table.

---

## 6. Subscription Management Interface

### 6.1 Layout
- **Header**:
  - Displays current `balance_free` and `balance_paid` credits.
  - Button to manage subscriptions (redirects to Stripe’s customer portal).
- **Main Section**:
  - Lists available plans with details (price, credits, features).
  - Option to purchase one-time credit add-ons.
- **History Section**:
  - Tab for transaction history (payment details, invoices).
  - Tab for credit usage history (feature, credits used, timestamp).
- **Footer**:
  - Links to support, refund policy, and terms of service.

### 6.2 Example Wireframe
```
----------------------------------------
| Free Credits: 50 | Paid Credits: 200 |
| [Manage Subscription]                |
----------------------------------------
| Plans:                               |
| - Basic ($10/mo, 100 credits)        |
| - Pro ($20/mo, 250 credits)          |
| - Enterprise ($50/mo, 1000 credits)  |
| [Buy Add-On Credits]                 |
----------------------------------------
| History:                             |
| - Transactions | Credit Usage        |
| [Transaction List]                   |
----------------------------------------
```

---

## 7. Security Considerations
- **Fingerprint Integration**: Use Fingerprint to limit free credit abuse by anonymous users.
- **Stripe Webhooks**: Validate webhook signatures to ensure authenticity.
- **Data Encryption**: Store sensitive data (e.g., `stripe_session_id`) encrypted in the database.
- **Rate Limiting**: Apply rate limits to API endpoints to prevent abuse.
- **GDPR Compliance**: Allow users to delete their accounts and associated data.

---

## 8. Scalability and Performance
- **Database Optimization**: Use indexes to speed up queries on `user_id`, `stripe_session_id`, etc.
- **Caching**: Cache frequently accessed data (e.g., user credit balance) using Redis.
- **Asynchronous Processing**: Handle Stripe webhooks asynchronously to avoid delays in user-facing operations.
- **Load Balancing**: Use a load balancer to distribute traffic across multiple backend servers.

---

## 9. Future Enhancements
- **Multi-Currency Support**: Allow users to pay in different currencies, with conversions handled by Stripe.
- **Promotional Credits**: Introduce time-limited promotional credits for marketing campaigns.
- **Analytics Dashboard**: Provide users with insights into credit usage patterns.
- **API Access**: Offer an API for developers to integrate with the subscription system (refer to https://x.ai/api for xAI’s API offerings).

---

## 10. References
- Stripe Documentation: https://stripe.com/docs
- Fingerprint Documentation: https://fingerprint.com/docs
- Example UI Inspiration: https://pikttochart.com/generative-ai/editor/