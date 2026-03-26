import MultiDiceLoader from './MultiDiceLoader'

/**
 * Compact rolling dice + busy text for buttons (auth, trades, withdrawals, tips).
 * Dice are decorative; the label is the control’s visible (and screen-reader) text.
 */
export default function SubmitDiceLabel({ busyLabel }) {
  return (
    <span className="submit-dice-label">
      <MultiDiceLoader size="xs" decorative inline className="submit-dice-label__dice" />
      <span>{busyLabel}</span>
    </span>
  )
}
