## Plan

### 1. Database: Create `financial_entries` table
- Track income, expenses, deductions by tax category
- Fields: amount, currency, category, tax_type (US/CR), receipt_url, date, description, deductible flag
- Tax categories for **US**: Property maintenance deduction, depreciation, home office, mortgage interest, property tax, insurance, repairs
- Tax categories for **CR**: IVA (13%), municipal taxes, property taxes (Impuesto de Bienes Inmuebles), income tax deductions, withholding
- RLS: users can only see their own org's entries

### 2. New page: `Financials.tsx`
- **Expense/Income tracker** with category tagging
- **Tax calculator** showing estimated taxes by jurisdiction (US vs CR based on estate country)
- **Year-end summary** with export to PDF for accountant
- **Receipt upload** linked to entries
- Replace CRM/Sales in sidebar for homeowner orgs → show "Financials" instead
- Landscaper orgs keep CRM & Sales as-is

### 3. Security messaging (everywhere)
- **Landing page**: New "Security & Trust" section with encryption, RLS, SOC2 mentions
- **Features page**: Add security section
- **Documents page**: Trust badge/banner
- **App footer**: Small security badge across the app

### 4. Sidebar logic
- If org_type is `landscaping_company` or `hybrid` → show CRM & Sales
- If org_type is `residential` → show Financials instead

Does this plan look right?