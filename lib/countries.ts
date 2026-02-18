
// Comprehensive list of European countries for TravelSafe
// Includes EU member states, non-EU European countries, and European microstates

export const EUROPEAN_COUNTRIES = [
  // EU Member States (alphabetical)
  'Austria',
  'Belgium', 
  'Bulgaria',
  'Croatia',
  'Cyprus',
  'Czech Republic',
  'Denmark',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'Ireland',
  'Italy',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Netherlands',
  'Poland',
  'Portugal',
  'Romania',
  'Slovakia',
  'Slovenia',
  'Spain',
  'Sweden',
  
  // Non-EU European Countries
  'Albania',
  'Andorra',
  'Belarus',
  'Bosnia and Herzegovina',
  'Iceland',
  'Kosovo',
  'Liechtenstein',
  'Moldova',
  'Monaco',
  'Montenegro',
  'North Macedonia',
  'Norway',
  'San Marino',
  'Serbia',
  'Switzerland',
  'Ukraine',
  'United Kingdom',
  'Vatican City',
  
  // Additional European territories (if needed)
  'Gibraltar',
  'Faroe Islands',
  'Greenland',
  'Isle of Man',
  'Jersey',
  'Guernsey',
  
  // Non-European countries (commonly selected)
  'United States',
  'Canada',
  'Australia',
  'New Zealand',
  'Japan',
  'South Korea',
  'Singapore',
  'India',
  'Brazil',
  'Mexico',
  'Argentina',
  'Chile',
  'South Africa',
  'Egypt',
  'Morocco',
  'Turkey',
  'Israel',
  'United Arab Emirates',
  'Saudi Arabia',
  'Qatar',
  'China',
  'Russia',
  'Other'
].sort() // Sort alphabetically for better UX

// European countries only (for specific European-only dropdowns if needed)
export const EUROPE_ONLY = EUROPEAN_COUNTRIES.filter(country => 
  !['United States', 'Canada', 'Australia', 'New Zealand', 'Japan', 'South Korea', 
    'Singapore', 'India', 'Brazil', 'Mexico', 'Argentina', 'Chile', 'South Africa', 
    'Egypt', 'Morocco', 'Turkey', 'Israel', 'United Arab Emirates', 'Saudi Arabia', 
    'Qatar', 'China', 'Russia', 'Other'].includes(country)
).sort()

// Default export for general use
export default EUROPEAN_COUNTRIES
