# OR Bullion

Cross-platform precious-metal refinery calculator built for iPhone, Android, and the web.

## V1 goals
- iPhone-first responsive interface
- 9K, 10K, 12K, 14K, 16K, 18K, 21K, 22K, 24K gold
- DWT and gram calculations
- Configurable payout percentage
- Full-precision totals with two-decimal display
- Shared calculation engine across Web, iOS, and Android
- Automated reference tests to protect calculation accuracy

## Architecture
The calculation engine lives in `src/calculations`, business configuration in `src/config`, and presentation separately. This keeps future metals, receipt features, customer workflows, and platform builds from duplicating business logic.

## Development
```bash
npm install
npm test
npm run dev
```

## Mobile
Capacitor is configured with app ID `com.orbullion.app`. Native iOS and Android projects will be generated after the web application foundation is validated.

## Status
V1 foundation in active development.
