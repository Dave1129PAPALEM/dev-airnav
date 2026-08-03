# How to Test if Smee.io is Working

Smee.io is a webhook payload delivery service that receives webhooks and forwards them to your local environment. Here is a quick guide to test if it's working correctly.

## Prerequisites
You need Node.js and `npm` installed to run the Smee client locally.

## Step 1: Create a Smee Channel
1. Go to [https://smee.io/](https://smee.io/)
2. Click on **"Start a new channel"**.
3. Copy the **Webhook Proxy URL** provided on the page (it will look like `https://smee.io/AbCdEfGhIjKlMnOp`).

## Step 2: Start the Local Smee Client
Open your terminal and run the following command (replace `<YOUR_SMEE_URL>` with the URL you copied, and adjust the target port if you are testing a specific local service like Jenkins):

```bash
# Install the smee client globally if you haven't already
npm install --global smee-client

# Start the client to forward payloads to a local port (e.g., Jenkins on port 8080)
smee -u <YOUR_SMEE_URL> -t http://localhost:8080/github-webhook/
```

*When running, the terminal will stay open and say `Connected`.*

## Step 3: Send a Test Payload
Leave the terminal from Step 2 running. Open a **new terminal window** and send a test POST request to your Smee URL using `curl`:

```bash
curl -X POST <YOUR_SMEE_URL> \
     -H "Content-Type: application/json" \
     -d '{"message": "Hello Smee! Testing if this works."}'
```

## Step 4: Verify the Result
1. **In the Smee.io Browser window**: You should immediately see a new event pop up on the web page containing your JSON payload.
2. **In your local terminal (running Smee)**: You should see a log indicating it received the POST request and attempted to forward it to your local target URL.

If both of these happen, **Smee.io is working perfectly!**
