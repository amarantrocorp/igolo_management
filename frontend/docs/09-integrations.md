# Setting Up Integrations

Igolo Interior connects with several external services to automate notifications, accept online payments, suggest addresses, and analyze floor plans. This guide walks you through setting up each integration.

---

## Table of Contents

1. [Email Notifications](#1-email-notifications)
2. [WhatsApp Business](#2-whatsapp-business)
3. [Razorpay (Online Payments)](#3-razorpay-online-payments)
4. [Google Maps](#4-google-maps)
5. [AI Floor Plan Analysis](#5-ai-floor-plan-analysis)

---

## 1. Email Notifications

### What Emails Does the System Send?

Igolo Interior automatically sends emails at key moments so your team and clients stay informed without any manual effort:

- **New lead assigned** -- When a lead is created or reassigned, the assigned sales person receives an email with the lead details.
- **Welcome email** -- New team members and clients receive a welcome email with their login credentials.
- **Quotation sent** -- When you send a quotation, your client receives a beautifully formatted email with a room-by-room breakdown and a button to view the quote online.
- **Payment confirmed** -- After a payment is verified, both the client and your finance team receive a receipt-style confirmation.
- **Project started** -- When a quotation is converted into a project, the client gets an email showing the 6-phase timeline.
- **Variation order updates** -- Clients and project managers are notified whenever a variation order is created, approved, or rejected.
- **Password reset** -- Users who request a password reset receive a secure link.

### How to Configure Your Email Settings

1. Go to **Settings** in your dashboard.
2. Navigate to **General** and then **SMTP / Email**.
3. Enter your email provider details:
   - **SMTP Host** -- For Gmail, use `smtp.gmail.com`. For other providers, check their documentation.
   - **SMTP Port** -- Usually `587` for most providers.
   - **Email Address** -- The email address your messages will be sent from (e.g., `hello@yourcompany.com`).
   - **Password** -- Your email password or app-specific password. For Gmail, you will need to generate an App Password in your Google Account security settings.
   - **Display Name** -- The name recipients will see (e.g., "Igolo Interior" or your company name).
4. Click **Save**.

If you skip this step, the system will still work -- emails simply will not be sent, and everything else continues as normal.

### Customizing Your Company Branding in Emails

All emails sent by Igolo Interior include your company logo, name, and branding colors. To update how your emails look:

1. Go to **Settings** and then **Company Information**.
2. Upload your company logo.
3. Update your company name and contact details.

These details are automatically reflected in every email the system sends.

---

## 2. WhatsApp Business

### What WhatsApp Notifications Are Available?

When WhatsApp is connected, the system can send template-based messages to your clients and team members:

- **Lead assigned** -- Notify a sales person about a new lead.
- **Quotation ready** -- Tell the client their quotation is ready to review, with a direct link.
- **Payment received** -- Confirm that a payment has been credited to the project.
- **Sprint update** -- Inform the client about progress on their project phases.
- **Project handover** -- Announce that the project is complete and ready for handover.

### How to Set Up WhatsApp Integration

Setting up WhatsApp requires a Meta Business account. Here is how to do it step by step:

1. **Create a Meta Business account** -- Visit the Meta Business Dashboard at business.facebook.com and sign up or log in.
2. **Set up WhatsApp Business** -- Inside the Meta Business Dashboard, go to WhatsApp and then API Setup.
3. **Get your credentials** -- Note your Phone Number ID and generate a permanent Access Token.
4. **Register message templates** -- Each type of notification (lead assigned, quote sent, etc.) needs to be registered as a template in Meta's system and approved before it can be used.
5. **Enter your credentials in Igolo Interior** -- Go to **Settings** and then **Integrations** and then **WhatsApp**. Enter your Phone Number ID and Access Token.
6. **Enable WhatsApp** -- Toggle the WhatsApp integration to "On."

### Testing Your WhatsApp Connection

After entering your credentials:

1. In the WhatsApp settings page, you will see a **Send Test Message** option.
2. Enter a phone number and click **Test**.
3. If the message arrives, you are all set. If not, double-check that your access token is valid and your templates have been approved by Meta.

---

## 3. Razorpay (Online Payments)

### Enabling Online Payments for Your Clients

With Razorpay connected, your clients can pay project milestones directly from their Client Portal using credit cards, debit cards, UPI, net banking, and other methods. Payments are automatically verified, credited to the project wallet, and your team is notified instantly.

### Setting Up Razorpay

1. **Create a Razorpay account** -- Sign up at dashboard.razorpay.com.
2. **Get your API keys** -- In the Razorpay Dashboard, go to **Settings** and then **API Keys**. Generate a Key ID and Key Secret pair. For testing, Razorpay provides test keys that simulate payments without real money.
3. **Enter your keys in Igolo Interior** -- Go to **Settings** and then **Integrations** and then **Razorpay**. Enter your Key ID and Key Secret.
4. **Switch to live mode** -- When you are ready to accept real payments, generate live keys from Razorpay (they start with `rzp_live_`) and replace the test keys.

### How the Payment Flow Works for Clients

Here is what your client experiences:

1. The client logs into their Client Portal and selects a project.
2. They click **Make Payment** and enter the amount (or select a milestone).
3. A secure Razorpay payment popup appears where they choose their payment method and complete the transaction.
4. Once the payment is successful, the amount is automatically credited to the project wallet.
5. The client sees a success confirmation, and your managers receive a notification.

Razorpay also handles subscription billing for your Igolo Interior plan. The same payment flow applies when upgrading your subscription.

---

## 4. Google Maps

### What It Does

When entering a lead's address, the system automatically suggests locations as you type. This saves time, reduces typos, and ensures addresses are accurate and complete.

The autocomplete works on:

- The **New Lead** form when entering an address.
- The **Lead Detail** page when editing an address.

### Setting Up Your Google Maps Key

1. Go to the Google Cloud Console at console.cloud.google.com.
2. Create a new project (or select an existing one).
3. Enable the **Maps JavaScript API** and the **Places API**.
4. Go to **Credentials** and create an API key.
5. For security, restrict the key to only your website domain.
6. Enter the key in **Settings** and then **Integrations** and then **Google Maps**.

If you skip this step, address fields will work as normal text inputs -- you just will not get the autocomplete suggestions.

---

## 5. AI Floor Plan Analysis

### What It Does

Upload a floor plan image, and the AI will automatically detect rooms, estimate dimensions, suggest a BHK configuration, and recommend interior items for each room. This can save significant time when building quotations.

### When to Use It

The AI floor plan analyzer is available inside the **Quotation Builder**. When starting a new quotation, instead of manually adding rooms one by one, you can:

1. Click **Upload Layout Plan**.
2. Select your floor plan file.
3. Click **Analyze**.
4. Review the detected rooms, dimensions, and suggested items.
5. Click **Apply** to populate your quotation automatically.

You can then fine-tune the rooms and items as needed.

### Supported Formats

The analyzer accepts the following file types:

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **PDF** (.pdf)

For best results, use a clear, high-resolution floor plan with labeled rooms. The AI provides a confidence score -- higher scores mean more reliable results. If the score is low, consider manually verifying the dimensions.
