# AI Photo Search — Frontend

Static site hosted on S3 (B1). Backend lives in
[cc_backend](https://github.com/happyananya/cc_backend).

## Setup

1. Set `apiBaseUrl` and `apiKey` in `config.js`.
2. API Gateway → Stages → `prod` → SDK Generation → JavaScript. Unzip it and copy
   `apigClient.js` and `lib/` into `sdk/`.
3. Push to GitHub. Pipeline P2 deploys the repo to the frontend bucket.

Search goes through the generated SDK (`apigClient.searchGet`). Upload uses `fetch`....!!
