# Final Response to Client

## Message

Hi Huzefa,

Thanks for the clarification! I wanted to confirm:

### Authorization Header

We **are** already including the Authorization header with the Bearer JWT token. Here's what we're sending:

**Our curl command:**
```bash
curl -X POST "https://participant.dev.canton.wolfedgelabs.com/v2/dars" \
  -H "Content-Type: application/octet-stream" \
  -H "Authorization: Bearer <token>" \
  --data-binary "@test-contract\.daml\dist\prediction-markets-test-1.0.0.dar"
```

**From our deployment logs, I can see the header is being sent:**
```
> POST /v2/dars HTTP/1.1
> Host: participant.dev.canton.wolfedgelabs.com
> Authorization: Bearer eyJhbGciOiJSUzI1NiIs...
```

However, we're still receiving:
- **HTTP Status**: 403 Forbidden
- **Error**: `"ledger_api_error":"invalid token"`

Could you help clarify:
- Is the Authorization header format correct as shown above?
- Should there be any specific spacing or formatting requirements?
- Is there something else we might be missing?

### DAR File

✅ **Yes, the DAR file has been built successfully!**

- **Location**: `test-contract\.daml\dist\prediction-markets-test-1.0.0.dar`
- **Size**: 529,133 bytes
- **Status**: Ready for deployment

The test contract DAR file is built and ready. We just need to resolve the authentication issue to proceed.

Would you be able to verify if there's something specific about the Authorization header format that Canton expects, or check if the token validation is working correctly on your end?

Thanks!

---

## Key Points

1. ✅ Authorization header IS being sent (confirmed in logs)
2. ✅ DAR file is built successfully
3. ❓ Still getting 403 "invalid token" error
4. ❓ Need clarification on header format or token validation

