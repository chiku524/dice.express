# Prediction Styles Specification

## 1. Overview

Markets on the platform support multiple **prediction styles** so users can create and trade on different kinds of questions across topics and industries. This doc defines each style, how it maps to data and resolution, and how the UI should present it.

---

## 2. Style Definitions

### 2.1 Binary (Yes/No)

- **Description**: Two outcomes; user bets Yes or No.
- **Example**: "Will BTC be above $100,000 on 2025-12-31?"
- **Outcomes**: `Yes`, `No`.
- **DAML**: Existing `MarketType = Binary`, `PositionType = Yes | No`.
- **Resolution**: One of `Yes` or `No`; winning shares pay out (e.g. 1 Credit per share).

### 2.2 True/False

- **Description**: Same as binary; semantic variant for fact/knowledge claims.
- **Example**: "True or False: The Earth is flat."
- **Outcomes**: `True`, `False`.
- **DAML**: Same as Binary; store outcomes as `["True", "False"]` or use `Binary` with display labels.
- **UI**: Style selector "True/False"; labels "True" and "False" instead of "Yes" and "No". Resolution and payouts identical to Binary.

### 2.3 Happens / Doesn’t

- **Description**: Event either happens or it doesn’t by a deadline.
- **Example**: "Will it rain in NYC on 2025-06-15?"
- **Outcomes**: `Happens`, `Doesn't` (or "Happens" / "Doesn't happen").
- **DAML**: Same as Binary; outcomes `["Happens", "Doesn't"]` or map to Yes/No internally.
- **UI**: Style "Happens / Doesn’t"; resolution often from oracle (e.g. weather API).

### 2.4 Multi-Outcome

- **Description**: N mutually exclusive outcomes; exactly one wins.
- **Example**: "Who will win the election? A / B / C / Other."
- **Outcomes**: User-defined list, e.g. `["A", "B", "C", "Other"]`.
- **DAML**: Existing `MarketType = MultiOutcome`, `PositionType = Outcome Text`.
- **Resolution**: One of the outcome strings; that outcome’s shares pay out.

### 2.5 Scalar / Range (Future)

- **Description**: Numeric outcome in a range; payouts by band or linear.
- **Example**: "What will the temperature in NYC be on 2025-06-15? (Fahrenheit)"
- **Outcomes**: Bands, e.g. `<32`, `32-50`, `50-70`, `70-90`, `>90`, or continuous with a formula.
- **DAML**: New template or extension (Phase 2); resolution = numeric value; payout by band or formula.
- **UI**: Slider or band selector; resolution from oracle (e.g. weather).

### 2.6 Conditional (Future)

- **Description**: Market resolves only if a condition is met; otherwise refund.
- **Example**: "If A wins the primary, will B win the general?"
- **DAML**: Phase 2; requires parent market resolution first.
- **UI**: "Conditional on [market/outcome]"; show condition clearly.

---

## 3. Data Model (Current DAML)

- **MarketType**: `Binary | MultiOutcome` (keep as is).
- **PositionType**: `Yes | No | Outcome Text`.
- **Optional extension**: Add to `Market` or `MarketCreationRequest`:
  - `category : Text` — e.g. "Finance", "Sports", "Politics".
  - `styleLabel : Text` — e.g. `"yesNo"`, `"trueFalse"`, `"happensDoesnt"`, `"multiOutcome"`. Used for discovery and UI only; resolution logic still uses `marketType` and `outcomes`.

### 3.1 Mapping styleLabel → Behavior

| styleLabel      | marketType  | outcomes (conceptual)     | Resolution values   |
|-----------------|------------|---------------------------|----------------------|
| yesNo           | Binary     | Yes, No                   | "Yes", "No"          |
| trueFalse       | Binary     | True, False               | "True", "False"      |
| happensDoesnt   | Binary     | Happens, Doesn't          | "Happens", "Doesn't" |
| multiOutcome    | MultiOutcome | User list               | One of outcome list  |

In DAML, for Binary we can keep a single representation (e.g. Yes/No) and let the frontend relabel; or add `outcomes : [Text]` to Market so that Binary markets can store `["True","False"]` or `["Happens","Doesn't"]` for display. Recommendation: add `outcomes` to Binary too (e.g. `["Yes","No"]` by default) and use that for display; resolution still uses "Yes"/"No" or the same strings as in `outcomes`.

---

## 4. Categories / Topics / Industries

- **Purpose**: Filter and browse markets (Finance, Sports, Politics, Weather, Entertainment, Crypto, etc.).
- **Schema**: Add `category : Text` (and optional `subcategory : Optional Text`) to market creation and Market.
- **UI**: Dropdown or tags when creating; filter and tabs on markets list.
- **Oracle**: Map category to recommended oracle (see ORACLE_STRATEGY.md).

---

## 5. Create Market UI (Recommendations)

1. **Title & description**: As today.
2. **Category**: Required; dropdown (Finance, Sports, Politics, Weather, Entertainment, Science, Crypto, Other).
3. **Prediction style**:
   - **Yes/No** (binary)
   - **True/False**
   - **Happens / Doesn’t**
   - **Multi-outcome** (then show outcome list input).
4. **Outcomes**: For Binary styles, prefill from style (Yes/No, True/False, Happens/Doesn’t). For Multi-outcome, comma or list input.
5. **Settlement**: Trigger (time, event, manual) and resolution criteria — unchanged.
6. **Resolution source**: Optional; "Oracle (e.g. price, sports, weather)" vs "Manual".

---

## 6. Resolution Rules (Summary)

- **Binary (all three styles)**: Resolve to one of the two outcome strings stored for that market; winning side gets payout per share.
- **Multi-outcome**: Resolve to exactly one of the outcome list; that outcome’s positions win.
- **Scalar/Conditional**: Defined in Phase 2 specs.

---

## 7. Implementation Checklist

- [ ] Add `category` and `styleLabel` (or equivalent) to DAML MarketCreationRequest and Market.
- [ ] Frontend: style selector in CreateMarket; map style to outcomes and labels.
- [ ] Frontend: category dropdown; persist and use in list/filter.
- [ ] Market list: filter by category; show style badge (Yes/No, True/False, etc.).
- [ ] Market detail / resolution: use same outcome strings for display and resolution.
