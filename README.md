# Amazon Core 5/6 Competitive Analysis Platform

An internal web-based tool that automates Amazon product competitive analysis through systematic data collection, AI-powered polling simulations, and automated scoring calculations.

## Features

- **Automated Data Collection**: OCR-powered screenshot analysis for price, shipping, reviews, and ratings
- **AI-Powered Polling**: Claude 3.5 Sonnet simulates 50 responses for image and feature evaluations
- **Precise Scoring**: Exact formulas with triple-check validation for 100% accuracy
- **Professional Reports**: Excel and Word document generation with exact formatting
- **Sequential Workflow**: Strict step-by-step process ensuring data integrity

## Quick Start

### 1. Clone and Install

\`\`\`bash
git clone <repository-url>
cd amazon-core-analyzer
npm install
\`\`\`

### 2. Set Up Environment Variables

Copy the example environment file and add your API keys:

\`\`\`bash
cp .env.example .env.local
\`\`\`

Edit \`.env.local\` and add your Claude API key:

\`\`\`env
ANTHROPIC_API_KEY=your_anthropic_api_key_here
\`\`\`

### 3. Run the Application

\`\`\`bash
npm run dev
\`\`\`

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Step 1: Analysis Type Selection
- Choose **Core 5** (5 competitors) or **Core 6** (your product + 5 competitors)
- Core 6 generates both Excel and Word reports

### Step 2: Data Collection
- Enter ASIN for each product
- Upload Amazon product page screenshots for automatic data extraction
- Verify OCR results or enter data manually
- Upload product images and describe features

### Step 3: AI Polling
- Run three mandatory polls:
  - **Main Image Poll**: Evaluate primary product images
  - **Image Stack Poll**: Evaluate complete image sets
  - **Features Poll**: Evaluate functionality and features
- Specify target demographics and evaluation questions

### Step 4: Score Calculation
- System automatically calculates scores using exact formulas
- Triple-check validation ensures 100% accuracy

### Step 5: Report Generation
- Download Excel report with exact formatting
- Download Word report (Core 6 only) with detailed analysis

## Scoring System

### Price Score (30 points)
Based on percentage over lowest price:
- 0% (Lowest) = 30 points
- ≤1% over = 27 points
- ≤3% over = 24 points
- ≤5% over = 21 points
- ≤8% over = 18 points
- ≤15% over = 15 points
- ≤20% over = 12 points
- ≤25% over = 9 points
- ≤30% over = 6 points
- ≤35% over = 3 points
- >35% over = 0 points

### Shipping Score (15 points)
Based on days difference from fastest:
- 0 days = 15 points
- ≤1 day slower = 13 points
- ≤2 days slower = 11 points
- ≤3 days slower = 9 points
- ≤4 days slower = 7 points
- ≤5 days slower = 5 points
- ≤6 days slower = 3 points
- ≤8 days slower = 1 point
- >8 days = 0 points

### Review Score (10 points)
Based on review count thresholds:
- 1000+ reviews = 10 points
- 750-999 reviews = 9 points
- 500-749 reviews = 8 points
- 300-499 reviews = 7 points
- 200-299 reviews = 6 points
- 100-199 reviews = 5 points
- 50-99 reviews = 4 points
- 25-49 reviews = 3 points
- 10-24 reviews = 2 points
- 5-9 reviews = 1 point
- <5 reviews = 0 points

### Rating Score (15 points)
Based on star rating:
- 5.0 stars = 15 points
- 4.9 stars = 14 points
- 4.8 stars = 13 points
- 4.7 stars = 12 points
- 4.6 stars = 11 points
- 4.5 stars = 10 points
- 4.4 stars = 9 points
- 4.3 stars = 8 points
- 4.2 stars = 7 points
- 4.1 stars = 6 points
- 4.0 stars = 5 points
- 3.9 stars = 4 points
- 3.8 stars = 3 points
- 3.7 stars = 2 points
- 3.6 stars = 1 point
- ≤3.5 stars = 0 points

### Image Scores (15 points total)
- Main Image: 10 points (1st=10, 2nd=8, 3rd=6, 4th=4, 5th=2, 6th=0)
- Image Stack: 5 points (1st=5, 2nd=4, 3rd=3, 4th=2, 5th=1, 6th=0)

### Features Score (15 points)
Based on poll ranking:
- 1st place = 15 points
- 2nd place = 12 points
- 3rd place = 9 points
- 4th place = 6 points
- 5th place = 3 points
- 6th place = 0 points

**Total Maximum Score: 100 points**

## Technical Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **AI**: Claude 3.5 Sonnet (Anthropic)
- **OCR**: AI-powered image analysis
- **File Generation**: ExcelJS, Docx
- **Deployment**: Vercel

## API Endpoints

- \`POST /api/ocr\` - Extract data from screenshots
- \`POST /api/poll\` - Run AI polling simulations
- \`POST /api/generate-excel\` - Generate Excel reports
- \`POST /api/generate-word\` - Generate Word reports (Core 6 only)

## Development

\`\`\`bash
# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
\`\`\`

## Deployment

### Vercel (Recommended)

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables in Vercel dashboard:
   - \`ANTHROPIC_API_KEY\`
4. Deploy

### Environment Variables

- \`ANTHROPIC_API_KEY\` (required): Your Claude API key
- \`NEXT_PUBLIC_APP_URL\` (optional): App URL for deployment

## Error Handling

- Input validation at every step
- OCR fallback to manual entry
- API retry logic with graceful failures
- Data persistence until download

## Security

- No user authentication required (internal tool)
- API keys stored in environment variables
- Input sanitization for all text fields
- HTTPS only deployment

## Support

For issues or questions, please check:
1. API key is correctly set in environment variables
2. All required fields are filled in each step
3. Screenshots are clear and contain all required data
4. Browser console for any JavaScript errors

## License

Internal use only.