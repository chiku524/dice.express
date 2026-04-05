/**
 * D1 API: d1-users
 */
import * as storage from '../../lib/cf-storage.mjs'
import * as d1 from '../lib/d1-shared.mjs'
import { hashPassword, verifyPassword } from '../../lib/auth.mjs'
import { addPips, pipsToCents, centsToPipsStr } from '../../lib/pips-precision.mjs'

export async function tryD1UserRoutes(ctx) {
  const { db, kv, r2, env, request, path, method, query, body, requestId, jsonResponse } = ctx

// GET /api/account — load persisted account/onboarding (by accountId)
if (path === 'account' && method === 'GET') {
  const accountId = query.accountId
  if (!accountId) return jsonResponse({ error: 'accountId required' }, 400)
  const row = await storage.getContractById(db, accountId)
  if (!row || row.templateId !== 'UserAccount') {
    return jsonResponse({ success: true, account: null })
  }
  const payload = row.payload || {}
  return jsonResponse({
    success: true,
    account: {
      accountId: row.contractId,
      displayName: payload.displayName ?? row.party,
      onboardingCompleted: payload.onboardingCompleted ?? false,
      fundChoice: payload.fundChoice ?? null,
      createdAt: payload.createdAt ?? row.createdAt,
    },
  })
}

// POST /api/account — persist account/onboarding (local + remote)
if (path === 'account' && method === 'POST') {
  const { accountId, displayName, onboardingCompleted, fundChoice } = body
  if (!accountId || !displayName) {
    return jsonResponse({ error: 'accountId and displayName required' }, 400)
  }
  const now = new Date().toISOString()
  const payload = {
    displayName: String(displayName).trim(),
    onboardingCompleted: Boolean(onboardingCompleted),
    fundChoice: fundChoice || null,
    createdAt: now,
  }
  await storage.upsertContract(db, {
    contract_id: accountId,
    template_id: 'UserAccount',
    payload,
    party: payload.displayName,
    status: 'Active',
  })
  await d1.backupToR2(r2, undefined, accountId, payload)
  return jsonResponse({ success: true, account: { accountId, ...payload } })
}

// POST /api/register — create user with email/password, persist to D1 and UserAccount contract
if (path === 'register' && method === 'POST') {
  const { email, password, displayName, fundChoice } = body
  const emailTrim = (email || '').trim().toLowerCase()
  const displayNameTrim = (displayName || '').trim()
  if (!emailTrim || !password || !displayNameTrim) {
    return jsonResponse({ error: 'Email, password, and display name are required' }, 400)
  }
  if (password.length < 8) {
    return jsonResponse({ error: 'Password must be at least 8 characters' }, 400)
  }
  const emailSimple = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailSimple.test(emailTrim)) {
    return jsonResponse({ error: 'Please enter a valid email address' }, 400)
  }
  const existing = await storage.getUserByEmail(db, emailTrim)
  if (existing) {
    return jsonResponse({ error: 'An account with this email already exists' }, 409)
  }
  const accountId = 'acc_' + crypto.randomUUID().replace(/-/g, '')
  const { hash: passwordHash, salt } = await hashPassword(password)
  await storage.createUser(db, {
    email: emailTrim,
    passwordHash,
    salt,
    accountId,
    displayName: displayNameTrim,
    fundChoice: fundChoice || null,
    onboardingCompleted: true,
  })
  const now = new Date().toISOString()
  const payload = { displayName: displayNameTrim, onboardingCompleted: true, fundChoice: fundChoice || null, createdAt: now }
  await storage.upsertContract(db, { contract_id: accountId, template_id: 'UserAccount', payload, party: displayNameTrim, status: 'Active' })
  await d1.backupToR2(r2, undefined, accountId, payload)
  return jsonResponse({ success: true, account: { accountId, displayName: displayNameTrim, fundChoice: fundChoice || null, createdAt: now } })
}

// POST /api/sign-in — verify email/password, return account for session restore
if (path === 'sign-in' && method === 'POST') {
  const { email, password } = body
  const emailTrim = (email || '').trim().toLowerCase()
  if (!emailTrim || !password) {
    return jsonResponse({ error: 'Email and password are required' }, 400)
  }
  const user = await storage.getUserByEmail(db, emailTrim)
  if (!user) {
    return jsonResponse({ error: 'Invalid email or password' }, 401)
  }
  const ok = await verifyPassword(password, user.salt, user.password_hash)
  if (!ok) {
    return jsonResponse({ error: 'Invalid email or password' }, 401)
  }
  return jsonResponse({
    success: true,
    account: {
      accountId: user.account_id,
      displayName: user.display_name,
      fundChoice: user.fund_choice ?? null,
      createdAt: user.created_at,
    },
  })
}

// GET/POST /api/get-user-balance — returns balance as 2-decimal string for precision
if (path === 'get-user-balance' && (method === 'GET' || method === 'POST')) {
  const { userParty } = method === 'GET' ? query : body
  if (!userParty) return jsonResponse({ error: 'User party required', message: 'Please provide userParty' }, 400)
  const raw = await storage.getBalanceRaw(db, userParty)
  const normalized = centsToPipsStr(pipsToCents(raw))
  await storage.setBalance(db, userParty, normalized)
  return jsonResponse({ success: true, balance: normalized })
}

// POST /api/update-user-balance
if (path === 'update-user-balance' && method === 'POST') {
  const ops = d1.checkOpsSecret(request, body, env, requestId)
  if (!ops.ok) return ops.response
  const { userParty, amount, operation } = body
  if (!userParty || amount === undefined || !operation) {
    return jsonResponse({ error: 'Missing required fields', required: ['userParty', 'amount', 'operation'] }, 400)
  }
  const amountPipsStr = addPips('0', amount)
  const amountCents = pipsToCents(amountPipsStr)
  if (amountCents < 0) return jsonResponse({ error: 'Invalid amount' }, 400)
  const currentRaw = await storage.getBalanceRaw(db, userParty)
  const currentCents = pipsToCents(currentRaw)
  let newBalStr
  if (operation === 'add') {
    newBalStr = addPips(currentRaw, amountPipsStr)
  } else if (operation === 'subtract') {
    if (amountCents === 0) return jsonResponse({ error: 'Amount must be positive to subtract' }, 400)
    if (currentCents < amountCents) {
      return jsonResponse({ error: 'Insufficient balance', currentBalance: currentRaw }, 400)
    }
    newBalStr = centsToPipsStr(currentCents - amountCents)
  } else {
    return jsonResponse({ error: 'Invalid operation', message: 'Operation must be "add" or "subtract"' }, 400)
  }
  await storage.setBalance(db, userParty, newBalStr)
  return jsonResponse({
    success: true,
    balance: newBalStr,
    previousBalance: currentRaw,
    newBalance: newBalStr,
    operation,
    amount: amountPipsStr,
  })
}

// POST /api/transfer-pips — tip another user (transfer Pips from one party to another)
if (path === 'transfer-pips' && method === 'POST') {
  const { fromParty, toParty, amount } = body
  if (!fromParty || !toParty || amount === undefined) {
    return jsonResponse({ error: 'fromParty, toParty, and amount are required' }, 400)
  }
  const from = String(fromParty).trim()
  const to = String(toParty).trim()
  if (from === to) return jsonResponse({ error: 'Cannot tip yourself' }, 400)
  const amountPipsStr = addPips('0', amount)
  const amountCents = pipsToCents(amountPipsStr)
  if (amountCents <= 0) return jsonResponse({ error: 'Amount must be positive' }, 400)
  const senderRaw = await storage.getBalanceRaw(db, from)
  const senderCents = pipsToCents(senderRaw)
  if (senderCents < amountCents) {
    return jsonResponse({
      error: 'Insufficient balance',
      currentBalance: senderRaw,
      required: amountPipsStr,
    }, 400)
  }
  const senderNewStr = centsToPipsStr(senderCents - amountCents)
  const recipientRaw = await storage.getBalanceRaw(db, to)
  const recipientNewStr = addPips(recipientRaw, amountPipsStr)
  await storage.setBalance(db, from, senderNewStr)
  await storage.setBalance(db, to, recipientNewStr)
  return jsonResponse({
    success: true,
    fromParty: from,
    toParty: to,
    amount: amountPipsStr,
    senderNewBalance: senderNewStr,
    recipientNewBalance: recipientNewStr,
  })
}
  return null
}
