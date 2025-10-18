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

### Price Score (10 points)
Based on percentage over lowest price:
- 0% (Lowest) = 10 points
- ≤1% over = 9 points
- ≤3% over = 8 points
- ≤5% over = 7 points
- etc.

### Shipping Score (10 points)
Based on days difference from fastest:
- 0 days = 10 points
- ≤1 day slower = 9 points
- ≤2 days slower = 8 points
- etc.

### Review Score (30 points)
Based on review count thresholds:
- 1000+ reviews = 30 points
- 950-999 reviews = 29 points
- etc.

### Rating Score (30 points)
Based on star rating:
- 5.0 stars = 30 points
- 4.9 stars = 29 points
- etc.

### Image Scores (20 points total)
- Main Image: 10 points (1st=10, 2nd=8, 3rd=6, etc.)
- Image Stack: 10 points (same ranking system)

### Features Score (30 points)
Based on poll ranking:
- 1st place = 30 points
- 2nd place = 25 points
- 3rd place = 20 points
- etc.

**Total Maximum Score: 130 points**

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