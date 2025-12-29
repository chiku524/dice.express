# Response to Client: JWT Decode & Onboarding Issue

## JWT Token Decode

### Header
```json
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "Cv8QAZDkzXNUoIwMNzYAlAJiAZU-niozUxTozGB8ys4"
}
```

### Payload (All Claims)
```json
{
  "exp": 1767033909,
  "iat": 1767032109,
  "jti": "onrtro:fce9ced8-1774-67c7-bc97-ebc5ed4b38ff",
  "iss": "https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet",
  "aud": [
    "https://canton.network.global",
    "account"
  ],
  "sub": "ee15aa3d-0bd4-44f9-9664-b49ad7e308aa",
  "typ": "Bearer",
  "azp": "Prediction-Market",
  "sid": "bb67b18c-dba4-478e-aa3e-cf264012d4e0",
  "acr": "1",
  "allowed-origins": ["/*"],
  "realm_access": {
    "roles": [
      "default-roles-canton-devnet",
      "offline_access",
      "uma_authorization"
    ]
  },
  "resource_access": {
    "account": {
      "roles": [
        "manage-account",
        "manage-account-links",
        "view-profile"
      ]
    }
  },
  "scope": "profile daml_ledger_api email",
  "email_verified": true,
  "name": "Nico Chikuji",
  "preferred_username": "nico",
  "given_name": "Nico",
  "family_name": "Chikuji",
  "email": "nico.builds@outlook.com"
}
```

### Key Information

**Keycloak User ID (Subject):**
- `sub`: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`
- This is the ID that needs to be mapped to a Canton party during onboarding

**User Details:**
- Email: `nico.builds@outlook.com`
- Name: `Nico Chikuji`
- Preferred Username: `nico`
- Client ID: `Prediction-Market`

**Token Details:**
- Issuer: `https://keycloak.wolfedgelabs.com:8443/realms/canton-devnet`
- Audience: `["https://canton.network.global", "account"]`
- Scopes: `profile daml_ledger_api email`
- Token Type: `Bearer`

## Onboarding Issue

### Problem Identified ✅

**The user has NOT been onboarded from the wallet UI.**

As you mentioned:
- When you onboard, Keycloak's user-id gets mapped to a newly created Canton user
- If the user hasn't been onboarded, there's no partyId created for the user
- Without a partyId, Canton cannot authenticate the user (hence the 403 "invalid token" error)

### Keycloak User ID to Map

**Subject (sub)**: `ee15aa3d-0bd4-44f9-9664-b49ad7e308aa`

This is the Keycloak user ID that needs to be mapped to a Canton party during onboarding.

## Questions

1. **How do we onboard the user via wallet UI?**
   - What is the URL/endpoint for the wallet UI?
   - What are the steps to complete onboarding?
   - Do we need to do anything special, or just log in with Keycloak credentials?

2. **After onboarding:**
   - Will the same JWT token work, or do we need to get a new token?
   - Will the partyId be included in the token, or do we need to query it separately?
   - What party name/ID will be assigned to this user?

3. **For testing:**
   - Can we onboard via API/script, or must it be done through the wallet UI?
   - Is there a way to check if a user is already onboarded?

## Current Status

- ✅ JWT token is valid and properly formatted
- ✅ Token has correct scopes (`daml_ledger_api`)
- ✅ Token has correct audience (`https://canton.network.global`)
- ✅ Token works for gRPC Admin API (deployment successful)
- ❌ User has NOT been onboarded (no partyId exists)
- ❌ JSON API returns 403 because there's no partyId to authenticate

## Next Steps

1. ⏭️ **Onboard user via wallet UI** (waiting for instructions)
2. ⏭️ **Get new token** (if needed after onboarding)
3. ⏭️ **Test JSON API** again after onboarding
4. ⏭️ **Verify partyId** is created and mapped correctly

## Full Token (for reference)

The full JWT token is stored in `token.txt` and `token.json` (expired, but format is correct).

**Token Structure:**
- Header: RS256 algorithm, JWT type
- Payload: All claims shown above
- Signature: RS256 signature (342 characters)

---

**Thank you for the clarification!** Once we onboard the user, the authentication should work correctly.

