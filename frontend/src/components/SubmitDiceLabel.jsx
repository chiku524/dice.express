import DiceLoader from './DiceLoader'

/**
 * Compact rolling die + busy text for buttons (auth, trades, withdrawals, tips).
 * Die is decorative; the label is the control’s visible (and screen-reader) text.
 */
export default function SubmitDiceLabel({ busyLabel }) {
  return (
    <span className="submit-dice-label">
      <DiceLoader size="xs" decorative className="submit-dice-label__dice" />
      <span>{busyLabel}</span>
    </span>
  )
}
