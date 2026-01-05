# Oracle Strategy for Prediction Markets

## Overview

Prediction markets require reliable, trustworthy data sources (oracles) to resolve markets accurately. This document outlines the oracle strategy for the Canton Prediction Markets application.

## Current Implementation

### RedStone Oracle (Primary)

**Status**: ✅ Implemented and Active

**What it provides**:
- Real-time price data for cryptocurrencies (BTC, ETH, etc.)
- Stock prices (AAPL, TSLA, etc.)
- Commodities and other financial instruments
- No API key required for basic usage
- Public API with good reliability

**Usage**:
- Market resolution for price-based markets
- Admin can fetch oracle data via MarketResolution component
- Data fetched via `/api/oracle` proxy endpoint

**Limitations**:
- Primarily financial/crypto data
- May not cover all market types (sports, politics, etc.)

## Required Oracle Types by Market Category

### 1. Financial Markets ✅
**Current Support**: RedStone Oracle
- **Cryptocurrencies**: BTC, ETH, USDC, USDT, etc.
- **Stocks**: AAPL, TSLA, GOOGL, etc.
- **Commodities**: Gold, Oil, etc.
- **Indices**: S&P 500, NASDAQ, etc.

**Trustworthiness**: High - RedStone aggregates from multiple sources

### 2. Sports Events ⚠️
**Required**: Sports data API
- **Options**:
  - **The Odds API** - Sports odds and results
  - **SportsDataIO** - Comprehensive sports data
  - **API-Football** - Football/soccer specific
  - **RapidAPI Sports** - Multiple sports

**Trustworthiness**: High for official results, Medium for odds

### 3. Political Events ⚠️
**Required**: Election/News APIs
- **Options**:
  - **NewsAPI** - News aggregation
  - **Election APIs** - Official election results
  - **RealClearPolitics API** - Political polling data

**Trustworthiness**: High for official results, Medium for polling

### 4. Weather/Climate ⚠️
**Required**: Weather APIs
- **Options**:
  - **OpenWeatherMap** - Weather data
  - **WeatherAPI** - Comprehensive weather
  - **NOAA API** - Official US weather data

**Trustworthiness**: High - Official weather services

### 5. General Knowledge/Events ⚠️
**Required**: News/Fact-checking APIs
- **Options**:
  - **NewsAPI** - News aggregation
  - **Wikipedia API** - Factual information
  - **Fact-checking APIs** - Verification services

**Trustworthiness**: Medium-High depending on source

## Recommended Oracle Providers by Category

### Tier 1: High Trustworthiness (Official Sources)
1. **Financial**: RedStone (current) ✅
2. **Weather**: NOAA, OpenWeatherMap
3. **Elections**: Official election APIs
4. **Sports**: Official league APIs

### Tier 2: Medium-High Trustworthiness (Aggregated)
1. **Sports**: The Odds API, SportsDataIO
2. **News**: NewsAPI
3. **Political**: RealClearPolitics API

### Tier 3: Medium Trustworthiness (User Verification)
1. **General Events**: Wikipedia API
2. **Social Media**: Twitter API (for trending topics)
3. **Custom Verification**: Manual admin verification

## Implementation Strategy

### Phase 1: Current (Financial Markets) ✅
- RedStone Oracle integrated
- Works for crypto/stock price markets
- Admin can resolve markets using price data

### Phase 2: Sports Markets (Recommended Next)
**Priority**: High (popular market type)

**Implementation**:
1. Integrate The Odds API or SportsDataIO
2. Add sports market type to CreateMarket
3. Update MarketResolution to support sports data
4. Add sports-specific resolution logic

**Example Market**: "Will Team A win the game on [date]?"
**Resolution**: Check official game results from sports API

### Phase 3: Political Markets
**Priority**: Medium

**Implementation**:
1. Integrate election/news APIs
2. Add political market type
3. Support for election results, polling data

**Example Market**: "Will Candidate X win the election?"
**Resolution**: Check official election results

### Phase 4: Weather/Climate Markets
**Priority**: Low-Medium

**Implementation**:
1. Integrate weather APIs
2. Add weather market type
3. Support for temperature, precipitation, etc.

**Example Market**: "Will it rain in [location] on [date]?"
**Resolution**: Check weather API for historical data

## Oracle Data Requirements

### Minimum Requirements for Each Oracle
1. **Reliability**: 99%+ uptime
2. **Accuracy**: Data from official/trusted sources
3. **Timeliness**: Real-time or near-real-time data
4. **API Access**: Public API or reasonable pricing
5. **Documentation**: Clear API documentation
6. **Rate Limits**: Sufficient for market resolution needs

### Data Format Standardization
All oracles should return data in a standardized format:
```json
{
  "symbol": "BTC",
  "value": 50000,
  "timestamp": "2025-01-15T12:00:00Z",
  "source": "RedStone",
  "confidence": 0.95
}
```

## Security Considerations

1. **API Key Management**: Store keys securely (environment variables)
2. **Rate Limiting**: Implement rate limiting to prevent abuse
3. **Data Validation**: Validate oracle data before using for resolution
4. **Multiple Sources**: Consider aggregating from multiple sources for critical markets
5. **Timestamp Verification**: Ensure data timestamps are recent and valid

## Cost Considerations

### Free Tier Options
- RedStone: Free (current) ✅
- OpenWeatherMap: Free tier available
- NewsAPI: Free tier available
- Wikipedia API: Free

### Paid Options (if needed)
- The Odds API: ~$10-50/month
- SportsDataIO: ~$50-200/month
- WeatherAPI: ~$5-20/month

## Recommendations

### Immediate Actions
1. ✅ **Keep RedStone** - Works well for financial markets
2. ⚠️ **Add Sports API** - High demand, good ROI
3. ⚠️ **Document Oracle Requirements** - Clear guidelines for market creators

### Long-term Strategy
1. **Multi-Oracle Support**: Allow markets to specify which oracle to use
2. **Oracle Aggregation**: Use multiple sources for critical markets
3. **Custom Oracles**: Allow admins to manually verify and input data
4. **Oracle Reputation**: Track oracle accuracy over time

## Market Type → Oracle Mapping

| Market Type | Recommended Oracle | Trust Level | Status |
|------------|-------------------|-------------|--------|
| Crypto Prices | RedStone | High | ✅ Implemented |
| Stock Prices | RedStone | High | ✅ Implemented |
| Sports Results | The Odds API / SportsDataIO | High | ⚠️ Not Implemented |
| Elections | Official Election APIs | Very High | ⚠️ Not Implemented |
| Weather | OpenWeatherMap / NOAA | High | ⚠️ Not Implemented |
| News Events | NewsAPI | Medium-High | ⚠️ Not Implemented |
| General Knowledge | Wikipedia API | Medium | ⚠️ Not Implemented |

## Next Steps

1. **Evaluate Sports APIs** - Test The Odds API and SportsDataIO
2. **Implement Sports Oracle** - Add sports market resolution
3. **Add Oracle Selection** - Allow market creators to choose oracle
4. **Document Oracle Usage** - Create user guide for oracle selection
5. **Monitor Oracle Performance** - Track accuracy and reliability

## Conclusion

The current RedStone Oracle implementation is solid for financial markets. To expand market types, we should prioritize:
1. **Sports markets** (highest demand)
2. **Political markets** (high engagement)
3. **Weather markets** (niche but useful)

Each new oracle should meet minimum requirements for reliability, accuracy, and API access.
