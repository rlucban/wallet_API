# API Documentation Summary

This document defines the RESTful endpoints required to support the Wallet application. The API design is backend-agnostic (could be implemented in .NET, Node.js, PHP, etc.) and handles the entities discovered in the application's local `db.json` and components.

## Entities & Endpoints

### 1. Authentication & Users
Manages user credentials, authentication, and session management.

* **POST /api/auth/login** - Authenticate user via passcode and return token/session.
* **POST /api/auth/register** - Register a new user.
* **POST /api/auth/logout** - Invalidate current session.
* **GET /api/users/{id}** - Retrieve user details.

**Data Model (User):**
* `id` (string)
* `name` (string)
* `passcode` (string) - Hashed password/passcode
* `currentSessionId` (string)

---

### 2. User Profiles
Manages user profile data such as onboarding status and initial balance configuration.

* **GET /api/profiles/{userId}** - Get profile data for a specific user.
* **PUT /api/profiles/{userId}** - Update user profile configuration.

**Data Model (UserProfile):**
* `id` (string)
* `userId` (string, foreign key)
* `name` (string)
* `isFirstRun` (boolean)
* `initialBalance` (number)

---

### 3. Transactions
Manages core income and expense tracking.

* **GET /api/transactions** - List transactions (supports filters: `userId`, `startDate`, `endDate`, `type`, `categoryId`).
* **GET /api/transactions/{id}** - Get specific transaction details.
* **POST /api/transactions** - Create a new transaction.
* **PUT /api/transactions/{id}** - Update an existing transaction.
* **DELETE /api/transactions/{id}** - Delete a transaction.

**Data Model (Transaction):**
* `id` (string)
* `userId` (string, foreign key)
* `amount` (number)
* `date` (datetime)
* `note` (string)
* `type` (enum: 'income', 'expense')
* `categoryId` (string, foreign key)
* `paymentMethod` (string)
* `establishment` (string, optional)
* `receiptUrl` (string, optional)

---

### 4. Categories
Manages expense and income categories. Standard categories might be system-wide, while custom ones are linked to users.

* **GET /api/categories** - List all categories.
* **POST /api/categories** - Create custom category.
* **PUT /api/categories/{id}** - Update custom category.
* **DELETE /api/categories/{id}** - Delete custom category.

**Data Model (Category):**
* `id` (string)
* `userId` (string, foreign key - nullable for global categories)
* `name` (string)
* `type` (enum: 'income', 'expense')

---

### 5. Budgets
Manages monthly budget thresholds for specific categories or overall tracking.

* **GET /api/budgets** - List budgets (supports tracking filters: `month`, `year`).
* **POST /api/budgets** - Set a new budget constraint.
* **PUT /api/budgets/{id}** - Update budget amount.
* **DELETE /api/budgets/{id}** - Remove budget limit.

**Data Model (Budget):**
* `id` (string)
* `categoryId` (string, foreign key - nullable for global budget limits)
* `amount` (number)
* `month` (string, e.g., '2026-03')

---

### 6. Agendas
Manages scheduled tasks or expected financial obligations on specific dates.

* **GET /api/agendas** - List agendas.
* **POST /api/agendas** - Create an agenda item.
* **PUT /api/agendas/{id}** - Update an agenda.
* **DELETE /api/agendas/{id}** - Delete an agenda.

**Data Model (Agenda):**
* `id` (string)
* `title` (string)
* `date` (datetime)
* `amount` (number)
* `completed` (boolean)

---

### 7. Subscriptions
Manages recurring bills or fixed monthly deductions.

* **GET /api/subscriptions** - List recorded subscriptions.
* **POST /api/subscriptions** - Create a subscription.
* **PUT /api/subscriptions/{id}** - Update subscription.
* **DELETE /api/subscriptions/{id}** - Delete subscription.

**Data Model (Subscription):**
* `id` (string)
* `name` (string)
* `amount` (number)
* `dueDate` (number - 1-31 representing day of the month)
* `category` (string, mapping to category name)

---

### 8. Savings Goals
Manages goals across time, accumulating amounts.

* **GET /api/savings-goals** - List all savings targets.
* **POST /api/savings-goals** - Create a savings goal.
* **PUT /api/savings-goals/{id}** - Update progress on a savings goal.
* **DELETE /api/savings-goals/{id}** - Delete a goal.

**Data Model (SavingsGoal):**
* `id` (string)
* `userId` (string, foreign key)
* `title` (string)
* `targetAmount` (number)
* `currentAmount` (number)
* `color` (string - UI hex color code)

---

### 9. Payment Methods
Lookup table for payment methodologies (Banks, e-wallets, cards). Often read-only for standardized integrations.

* **GET /api/payment-methods** - Retrieve available payment methodologies mapping.

**Data Model (PaymentMethod):**
* `id` (string)
* `name` (string)
* `type` (enum: 'cash', 'bank', 'e_wallet', 'card')
* `icon` (string - UI mapping reference)
