# Security: Wallet Connection

## How Canton Wallet Connection Works

### Party ID (Public Identifier)
- Party IDs in Canton are **public identifiers**, similar to Ethereum addresses
- Anyone who knows a Party ID can see contracts visible to that party
- **Party ID alone is NOT enough to authorize actions** - you need authentication tokens

### Authentication (Keycloak Tokens)
- To actually interact with contracts (create, exercise choices, etc.), you need:
  1. **Party ID** - Identifies which party you're acting as
  2. **Authentication Token** - Keycloak JWT token that proves you have permission to act as that party

### Security Model
- **Without a valid token**: You cannot interact with contracts, even if you know the Party ID
- **With a valid token**: You can interact with contracts visible to that party
- This is similar to Ethereum: addresses are public, but private keys (or in Canton's case, auth tokens) are required to sign transactions

### Current Implementation
- Users must provide:
  - **Party ID**: Identifies their wallet/party
  - **Keycloak credentials** (username/password): Used to obtain authentication tokens

### Is This Secure?
Yes, this is how Canton is designed to work:
- Party IDs are meant to be public identifiers
- Authentication tokens are the actual security mechanism
- The combination of Party ID + valid token is required for all blockchain interactions
- Without a valid token, knowing a Party ID only allows you to **view** contracts, not **interact** with them

### Recommendations
- **Party IDs**: Can be shared publicly (they're identifiers, not secrets)
- **Authentication Tokens**: Must be kept secure (stored in localStorage, not shared)
- **Keycloak Credentials**: Should never be hardcoded or stored insecurely

### Alternative Approaches
- Canton's authentication system is centralized (Keycloak)
- For production, consider:
  - Using hardware wallet integration (if Canton supports it)
  - Implementing additional application-level authentication
  - Using OAuth2/OpenID Connect flows instead of direct username/password
