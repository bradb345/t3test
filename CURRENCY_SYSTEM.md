# Currency Management System

This application now includes a robust currency management system that automatically handles different currencies based on property location.

## Overview

The system automatically detects and sets the appropriate currency for properties based on their geographic coordinates. Currently, it supports:

- **Cayman Islands (KY)**: Uses Cayman Islands Dollar (KYD) with symbol "CI$"
- **All Other Locations**: Defaults to US Dollar (USD) with symbol "$"

## How It Works

### 1. **Automatic Currency Detection**

When a property is created, the system:
1. Takes the property's latitude and longitude coordinates
2. Checks if the coordinates fall within any supported country's boundaries using geospatial calculations
3. Assigns the appropriate currency code to the property
4. The currency is inherited by all units created for that property

### 2. **Database Schema**

The following tables now have a `currency` field:
- `properties` - Stores the property's currency (default: "USD")
- `units` - Inherits currency from parent property (default: "USD")
- `leases` - Stores currency for lease agreements (default: "USD")
- `payments` - Stores currency for payment transactions (default: "USD")

### 3. **Currency Configuration**

All currency configurations are centralized in `src/lib/currency/config.ts`:

```typescript
export const CURRENCIES = {
  KYD: {
    code: "KYD",
    symbol: "CI$",
    name: "Cayman Islands Dollar",
    decimalPlaces: 2,
  },
  USD: {
    code: "USD",
    symbol: "$",
    name: "US Dollar",
    decimalPlaces: 2,
  },
};
```

### 4. **Supported Countries**

Currently supported countries are defined in `SUPPORTED_COUNTRIES` array:

```typescript
export const SUPPORTED_COUNTRIES = [
  {
    code: "KY",
    name: "Cayman Islands",
    currency: CURRENCIES.KYD,
    polygon: [/* Boundary coordinates */],
  },
];
```

## Usage Examples

### Detecting Currency from Coordinates

```typescript
import { detectCurrencyFromCoordinates } from "~/lib/currency";

// Example: Property in George Town, Cayman Islands
const currency = detectCurrencyFromCoordinates(19.3, -81.4);
console.log(currency.code); // "KYD"
console.log(currency.symbol); // "CI$"

// Example: Property outside supported regions
const currency2 = detectCurrencyFromCoordinates(40.7128, -74.0060);
console.log(currency2.code); // "USD"
console.log(currency2.symbol); // "$"
```

### Formatting Currency

```typescript
import { formatCurrency, formatMonthlyRent } from "~/lib/currency";

// Format a price
const price = formatCurrency(1500, "KYD");
// Returns: "CI$1,500.00"

// Format monthly rent
const rent = formatMonthlyRent(2500, "USD");
// Returns: "$2,500.00/month"

// Compact notation for large amounts
const largePrice = formatCurrency(1500000, "KYD", { compact: true });
// Returns: "CI$1.5M"
```

### Getting Currency Symbol

```typescript
import { getCurrencySymbol } from "~/lib/currency";

const symbol = getCurrencySymbol("KYD");
// Returns: "CI$"
```

## Adding New Countries/Currencies

To add support for a new country and currency:

### Step 1: Add Currency Definition

In `src/lib/currency/config.ts`, add the new currency to the `CURRENCIES` object:

```typescript
export const CURRENCIES = {
  // ... existing currencies
  GBP: {
    code: "GBP",
    symbol: "£",
    name: "British Pound Sterling",
    decimalPlaces: 2,
  },
};
```

### Step 2: Define Country Boundaries

Add the country to the `SUPPORTED_COUNTRIES` array with its geographic boundaries:

```typescript
export const SUPPORTED_COUNTRIES = [
  // ... existing countries
  {
    code: "GB",
    name: "United Kingdom",
    currency: CURRENCIES.GBP,
    polygon: [
      // Define boundary coordinates as [longitude, latitude] pairs
      // You can use tools like geojson.io to get these coordinates
      [-5.7, 50.0],
      [1.8, 50.0],
      [1.8, 58.6],
      [-5.7, 58.6],
      [-5.7, 50.0], // Close the polygon
    ],
  },
];
```

### Step 3: Test

The system will automatically:
- Detect the new currency for properties in that region
- Format amounts with the correct symbol
- Apply the currency to units, leases, and payments

## Technical Implementation

### Libraries Used

- **@turf/turf**: Geospatial library for point-in-polygon calculations
- **@turf/boolean-point-in-polygon**: Specifically for checking if coordinates are within boundaries

### Architecture

```
src/lib/currency/
├── config.ts       # Currency and country definitions
├── detector.ts     # Geographic detection logic
├── formatter.ts    # Currency formatting utilities
└── index.ts        # Public API exports
```

### API Integration

The currency detection is automatically applied in:
- `POST /api/properties/route.ts` - When creating a property
- `POST /api/properties/[id]/units/route.ts` - When creating a unit (inherits from property)

## Migration

A database migration has been generated: `drizzle/0007_ancient_jack_power.sql`

To apply the migration:

```bash
npm run db:push
```

This adds the `currency` column to the relevant tables with a default value of "USD".

## Future Enhancements

Possible improvements:
- Add more currencies and countries
- Support for currency conversion
- Display exchange rates
- Multi-currency payment processing
- Historical currency data for reporting
- Tenant-specific currency preferences

## Notes

- All existing records will default to USD until updated
- The Cayman Islands polygon covers Grand Cayman, Cayman Brac, and Little Cayman
- Currency symbols are displayed in property and unit forms
- The system is designed to be easily extensible for additional currencies
