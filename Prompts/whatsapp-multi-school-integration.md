# 📱 WhatsApp Multi-School Integration Guide
### SMS SaaS Platform — One Meta Business Account, Multiple Schools

---

## 📌 Table of Contents

1. [Overview & Architecture](#overview)
2. [One-Time Meta Setup (You)](#meta-setup)
3. [Database Schema](#database)
4. [School Onboarding Flow](#onboarding)
5. [Backend APIs](#backend-apis)
6. [Frontend UI](#frontend)
7. [Sending Notifications](#sending)
8. [Message Templates](#templates)
9. [Usage Tracking](#tracking)
10. [Security](#security)
11. [Cost Breakdown](#cost)
12. [Environment Variables](#env)

---

## 1. Overview & Architecture {#overview}

### How It Works

```
YOU (SMS SaaS) — One Meta Business Account
        │
        ├── School A → Phone Number ID: 111 → Number: +92300-1111111
        ├── School B → Phone Number ID: 222 → Number: +92300-2222222
        ├── School C → Phone Number ID: 333 → Number: +92300-3333333
        └── School D → Phone Number ID: 444 → Number: +92300-4444444
```

- You manage **ONE** Meta Business Account
- Each school adds their own phone number under YOUR account
- Each number gets a unique **Phone Number ID**
- You use **ONE System User Token** (never expires) to send all messages
- Parents receive messages from **their school's number** — not from "SMS SaaS"
- Each number gets **1,000 free conversations/month** from Meta

### Key Concepts

| Term | Meaning |
|---|---|
| **Business Account ID** | Your Meta Business unique ID |
| **Phone Number ID** | Unique ID Meta assigns to each added phone number |
| **System User Token** | Permanent token you generate once — never expires |
| **Conversation** | 24hr window of messages to one person = 1 conversation |
| **Template** | Pre-approved message format required for business-initiated messages |

---

## 2. One-Time Meta Setup (You Do This Once) {#meta-setup}

### Step 1 — Create Meta Developer App

```
1. Go to developers.facebook.com
2. Click "My Apps" → "Create App"
3. Select "Business" as app type
4. Fill in app name: "SMS SaaS"
5. Add WhatsApp product to your app
6. Go to WhatsApp → Getting Started
7. Copy your:
   ✅ App ID
   ✅ Business Account ID
   ✅ Temporary Token (we'll replace with System Token)
```

### Step 2 — Create System User Token (Never Expires)

```
1. Go to business.facebook.com
2. Settings (gear icon) → Users → System Users
3. Click "Add" → Name: "SMS SaaS Bot" → Role: Admin
4. Click "Generate New Token"
5. Select your App
6. Enable these permissions:
   ✅ whatsapp_business_messaging
   ✅ whatsapp_business_management
7. Copy the token → Save in your .env as WHATSAPP_SYSTEM_TOKEN

⚠️ This token NEVER expires — keep it secret!
```

### Step 3 — Verify Your Facebook Business

```
1. Go to business.facebook.com → Settings → Business Info
2. Complete Business Verification:
   ✅ Upload business documents (NTN, SECP registration)
   ✅ Verify domain (your SaaS domain)
3. Verification takes 1-3 business days
4. Without verification — you're limited to 1,000 messages/day total
5. After verification — 100,000+ messages/day
```

---

## 3. Database Schema {#database}

```sql
-- WhatsApp config per school (tenant)
CREATE TABLE whatsapp_configs (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                UUID REFERENCES tenants(id) UNIQUE NOT NULL,

  -- Number details
  phone_number_id          TEXT UNIQUE,          -- Meta-assigned Phone Number ID
  whatsapp_number          TEXT,                 -- e.g. +923001234567
  display_name             TEXT,                 -- e.g. "Greenwood High School"

  -- Status
  is_verified              BOOLEAN DEFAULT FALSE,
  is_active                BOOLEAN DEFAULT FALSE,
  verified_at              TIMESTAMPTZ,

  -- Usage tracking (reset monthly)
  messages_sent_this_month INT DEFAULT 0,
  conversations_this_month INT DEFAULT 0,
  last_reset_date          DATE DEFAULT CURRENT_DATE,

  created_at               TIMESTAMPTZ DEFAULT NOW()
);

-- Notification logs
CREATE TABLE notification_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID REFERENCES tenants(id),
  student_id       UUID REFERENCES students(id),
  recipient_phone  TEXT NOT NULL,
  type             TEXT,     -- attendance, fee, result, announcement
  template_name    TEXT,
  params           JSONB,
  status           TEXT DEFAULT 'pending',   -- pending, sent, failed
  error_message    TEXT,
  sent_at          TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security — schools only see their own config
ALTER TABLE whatsapp_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_whatsapp_config" ON whatsapp_configs
  FOR ALL USING (
    tenant_id = (
      SELECT tenant_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Monthly usage reset function
CREATE OR REPLACE FUNCTION increment_whatsapp_count(p_tenant_id UUID)
RETURNS VOID AS $$
  UPDATE whatsapp_configs
  SET messages_sent_this_month = messages_sent_this_month + 1
  WHERE tenant_id = p_tenant_id;
$$ LANGUAGE SQL;

-- Auto-reset on 1st of every month (requires pg_cron extension)
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'reset-whatsapp-counts',
  '0 0 1 * *',
  $$
    UPDATE whatsapp_configs
    SET messages_sent_this_month = 0,
        conversations_this_month = 0,
        last_reset_date = CURRENT_DATE;
  $$
);
```

---

## 4. School Onboarding Flow {#onboarding}

```
School Admin opens Settings → WhatsApp Setup
          │
          ▼
Enters their phone number (e.g. 03001234567)
          │
          ▼
Your backend calls Meta API to register that number
under YOUR Business Account
          │
          ▼
Meta sends OTP to school's number via SMS/WhatsApp
          │
          ▼
School enters OTP in your platform
          │
          ▼
Your backend verifies OTP with Meta
          │
          ▼
Meta returns Phone Number ID for that number
          │
          ▼
You save Phone Number ID → tied to that tenant_id in DB
          │
          ▼
✅ WhatsApp active for that school!
```

---

## 5. Backend APIs {#backend-apis}

### Encryption Helper (Always Encrypt Sensitive Data)

```js
// lib/encryption.js
import crypto from 'crypto'

const SECRET = process.env.ENCRYPTION_SECRET  // Must be exactly 32 characters

export const encrypt = (text) => {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(SECRET), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return `${iv.toString('hex')}:${encrypted.toString('hex')}`
}

export const decrypt = (text) => {
  const [iv, encrypted] = text.split(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    Buffer.from(SECRET),
    Buffer.from(iv, 'hex')
  )
  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, 'hex')),
    decipher.final()
  ]).toString()
}
```

---

### API 1 — Add School's Number to Your Meta Account

```js
// app/api/whatsapp/add-number/route.js

export async function POST(req) {
  const { phone, displayName, tenantId } = await req.json()

  // Remove leading zero and spaces from Pakistan number
  // 03001234567 → 923001234567
  const formattedPhone = phone.replace(/^0/, '92').replace(/\s/g, '')

  // Step 1 — Register number under YOUR Meta Business Account
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_BUSINESS_ACCOUNT_ID}/phone_numbers`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_SYSTEM_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        cc: '92',                         // Pakistan country code
        phone_number: phone.replace(/^0/, ''), // without leading 0
        migrate_phone_number: false,
      })
    }
  )

  const data = await res.json()

  if (data.error) {
    return Response.json({
      success: false,
      error: data.error.message
    }, { status: 400 })
  }

  // Step 2 — Save Phone Number ID in DB (not verified yet)
  const { error: dbError } = await supabase
    .from('whatsapp_configs')
    .upsert({
      tenant_id: tenantId,
      phone_number_id: data.id,
      whatsapp_number: formattedPhone,
      display_name: displayName,
      is_verified: false,
      is_active: false,
    })

  if (dbError) throw dbError

  // Step 3 — Request OTP to verify the number
  await fetch(
    `https://graph.facebook.com/v18.0/${data.id}/request_code`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_SYSTEM_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        code_method: 'SMS',   // or 'VOICE'
        language: 'en'
      })
    }
  )

  return Response.json({
    success: true,
    message: 'OTP sent to your WhatsApp number'
  })
}
```

---

### API 2 — Verify OTP

```js
// app/api/whatsapp/verify-otp/route.js

export async function POST(req) {
  const { otp, tenantId } = await req.json()

  // Get this school's phone_number_id
  const { data: config } = await supabase
    .from('whatsapp_configs')
    .select('phone_number_id')
    .eq('tenant_id', tenantId)
    .single()

  if (!config) {
    return Response.json({ success: false, error: 'WhatsApp not initialized' })
  }

  // Verify OTP with Meta
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${config.phone_number_id}/verify_code`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_SYSTEM_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code: otp })
    }
  )

  const data = await res.json()

  if (data.success) {
    // Mark as verified and active
    await supabase
      .from('whatsapp_configs')
      .update({
        is_verified: true,
        is_active: true,
        verified_at: new Date().toISOString()
      })
      .eq('tenant_id', tenantId)

    return Response.json({ success: true })
  }

  return Response.json({ success: false, error: 'Invalid OTP. Please try again.' })
}
```

---

### API 3 — Test Connection

```js
// app/api/whatsapp/test/route.js

export async function POST(req) {
  const { tenantId } = await req.json()

  const { data: config } = await supabase
    .from('whatsapp_configs')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()

  if (!config?.is_verified) {
    return Response.json({ success: false, error: 'Number not verified yet' })
  }

  // Send a test message to the school's own number
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_SYSTEM_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: config.whatsapp_number,
        type: 'text',
        text: {
          body: '✅ SMS SaaS WhatsApp connected successfully! Your school notifications are now active.'
        }
      })
    }
  )

  const data = await res.json()
  return Response.json({ success: !!data.messages })
}
```

---

### API 4 — Disable / Enable WhatsApp for a School

```js
// app/api/whatsapp/toggle/route.js

export async function POST(req) {
  const { tenantId, isActive } = await req.json()

  await supabase
    .from('whatsapp_configs')
    .update({ is_active: isActive })
    .eq('tenant_id', tenantId)

  return Response.json({ success: true })
}
```

---

## 6. Core Sending Function {#sending}

This is the single function used across your entire platform to send any WhatsApp message:

```js
// lib/whatsapp.js

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // service role for server-side
)

/**
 * Send WhatsApp notification using the school's own number
 * @param {string} tenantId - The school's tenant ID
 * @param {string} phone - Parent's phone number (e.g. 3001234567)
 * @param {string} templateName - Approved Meta template name
 * @param {string[]} params - Template variable values
 * @param {string} studentId - Optional student ID for logging
 */
export const sendWhatsApp = async (tenantId, phone, templateName, params, studentId = null) => {

  // 1. Get THIS school's WhatsApp config
  const { data: config, error } = await supabase
    .from('whatsapp_configs')
    .select('phone_number_id, is_active, is_verified, messages_sent_this_month')
    .eq('tenant_id', tenantId)
    .single()

  // Safety checks
  if (error || !config) {
    console.log(`[WhatsApp] No config found for tenant: ${tenantId}`)
    return { success: false, error: 'WhatsApp not configured' }
  }

  if (!config.is_verified) {
    return { success: false, error: 'WhatsApp number not verified' }
  }

  if (!config.is_active) {
    return { success: false, error: 'WhatsApp is disabled for this school' }
  }

  // 2. Format phone number
  const formattedPhone = `92${phone.replace(/^0/, '').replace(/\s/g, '')}`

  // 3. Send using YOUR system token + THEIR phone number ID
  const res = await fetch(
    `https://graph.facebook.com/v18.0/${config.phone_number_id}/messages`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.WHATSAPP_SYSTEM_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: formattedPhone,
        type: 'template',
        template: {
          name: templateName,
          language: { code: 'en' },
          components: [
            {
              type: 'body',
              parameters: params.map(p => ({
                type: 'text',
                text: String(p)
              }))
            }
          ]
        }
      })
    }
  )

  const result = await res.json()
  const success = !!result.messages

  // 4. Increment usage counter
  if (success) {
    await supabase.rpc('increment_whatsapp_count', { p_tenant_id: tenantId })
  }

  // 5. Log to notification_logs
  await supabase.from('notification_logs').insert({
    tenant_id: tenantId,
    student_id: studentId,
    recipient_phone: formattedPhone,
    template_name: templateName,
    params: params,
    status: success ? 'sent' : 'failed',
    error_message: success ? null : result.error?.message,
    sent_at: new Date().toISOString()
  })

  return { success, data: result }
}
```

---

### Usage Examples Across Your Platform

```js
// ✅ Attendance alert
await sendWhatsApp(
  tenantId,
  student.parent_phone,
  'attendance_alert',
  [student.name, student.class, today],
  student.id
)

// ✅ Fee reminder
await sendWhatsApp(
  tenantId,
  parent.phone,
  'fee_reminder',
  [student.name, `PKR ${amount}`, dueDate],
  student.id
)

// ✅ Exam result
await sendWhatsApp(
  tenantId,
  parent.phone,
  'exam_result',
  [student.name, subject, `${marks}/${total}`],
  student.id
)

// ✅ School announcement
await sendWhatsApp(
  tenantId,
  parent.phone,
  'school_announcement',
  [schoolName, message]
)
```

---

### Auto-Trigger on Attendance Event

```js
// app/api/attendance/mark/route.js

export async function POST(req) {
  const { studentId, status, date, tenantId } = await req.json()

  // 1. Save to DB
  await supabase.from('attendance').insert({
    student_id: studentId,
    status,
    date,
    tenant_id: tenantId
  })

  // 2. Notify parent if absent
  if (status === 'absent') {
    const { data: student } = await supabase
      .from('students')
      .select('name, class_name, parent_phone')
      .eq('id', studentId)
      .single()

    if (student?.parent_phone) {
      await sendWhatsApp(
        tenantId,
        student.parent_phone,
        'attendance_alert',
        [student.name, student.class_name, date],
        studentId
      )
    }
  }

  return Response.json({ success: true })
}
```

---

## 7. Message Templates {#templates}

Templates must be submitted to Meta for approval before use. Approval takes 24-48 hours.

### How to Submit Templates

```
1. Go to developers.facebook.com
2. WhatsApp → Message Templates
3. Click "Create Template"
4. Category: Utility (fastest approval)
5. Add variables using {{1}}, {{2}}, {{3}}
6. Submit for review
```

### Template 1 — Attendance Alert

```
Name: attendance_alert
Category: Utility
Language: English

Body:
Dear Parent, {{1}} was marked ABSENT in {{2}} on {{3}}.
Please contact school if this is an error.
- SMS SaaS School Portal

Variables:
{{1}} = Student Name
{{2}} = Class Name
{{3}} = Date
```

### Template 2 — Fee Reminder

```
Name: fee_reminder
Category: Utility

Body:
Dear Parent, a fee of {{2}} for {{1}} is due on {{3}}.
Please clear dues to avoid late charges.
- SMS SaaS School Portal

Variables:
{{1}} = Student Name
{{2}} = Amount (PKR 5000)
{{3}} = Due Date
```

### Template 3 — Exam Result

```
Name: exam_result
Category: Utility

Body:
Dear Parent, {{1}} has received {{3}} in {{2}}.
View the complete report card on your school portal.
- SMS SaaS School Portal

Variables:
{{1}} = Student Name
{{2}} = Subject
{{3}} = Score (85/100)
```

### Template 4 — School Announcement

```
Name: school_announcement
Category: Utility

Body:
📢 Announcement from {{1}}:

{{2}}

- SMS SaaS School Portal

Variables:
{{1}} = School Name
{{2}} = Announcement Text
```

### Template 5 — Fee Paid Confirmation

```
Name: fee_paid_confirmation
Category: Utility

Body:
✅ Payment Confirmed! Dear Parent, we have received the fee payment of {{2}} for {{1}}.
Receipt No: {{3}}
Thank you!
- SMS SaaS School Portal

Variables:
{{1}} = Student Name
{{2}} = Amount
{{3}} = Receipt Number
```

---

## 8. Frontend UI — School WhatsApp Setup Wizard {#frontend}

```jsx
// components/settings/WhatsAppSetup.jsx
'use client'
import { useState } from 'react'

export default function WhatsAppSetup({ tenantId, schoolName }) {
  const [step, setStep] = useState(1)
  const [phone, setPhone] = useState('')
  const [otp, setOtp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [config, setConfig] = useState(null)

  // Step 1 — Submit phone number
  const handleAddNumber = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/whatsapp/add-number', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, displayName: schoolName, tenantId })
    })

    const data = await res.json()

    if (data.success) {
      setStep(2)
    } else {
      setError(data.error || 'Failed to register number. Try again.')
    }
    setLoading(false)
  }

  // Step 2 — Verify OTP
  const handleVerifyOTP = async () => {
    setLoading(true)
    setError('')

    const res = await fetch('/api/whatsapp/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp, tenantId })
    })

    const data = await res.json()

    if (data.success) {
      setStep(3)
    } else {
      setError(data.error || 'Invalid OTP. Please try again.')
    }
    setLoading(false)
  }

  // Step 3 — Test
  const handleTest = async () => {
    setLoading(true)
    const res = await fetch('/api/whatsapp/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tenantId })
    })
    const data = await res.json()
    if (data.success) setStep(4)
    setLoading(false)
  }

  return (
    <div className="whatsapp-setup p-6 max-w-lg">
      <h2 className="text-xl font-bold mb-4">📱 Connect WhatsApp</h2>

      {/* Progress Steps */}
      <div className="steps flex gap-2 mb-6">
        {['Enter Number', 'Verify OTP', 'Test', 'Done'].map((s, i) => (
          <div
            key={i}
            className={`step text-sm px-3 py-1 rounded ${step > i ? 'bg-green-500 text-white' : 'bg-gray-200'}`}
          >
            {s}
          </div>
        ))}
      </div>

      {error && (
        <div className="error bg-red-100 text-red-600 p-3 rounded mb-4">
          ❌ {error}
        </div>
      )}

      {/* Step 1 — Phone Number */}
      {step === 1 && (
        <div>
          <p className="text-gray-600 mb-4">
            Enter the phone number parents will receive messages from.
            This number must NOT be active on WhatsApp already.
          </p>
          <label className="block text-sm font-medium mb-1">Phone Number</label>
          <input
            type="tel"
            placeholder="03001234567"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-4"
          />
          <button
            onClick={handleAddNumber}
            disabled={loading || !phone}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Sending OTP...' : 'Send OTP →'}
          </button>
        </div>
      )}

      {/* Step 2 — OTP */}
      {step === 2 && (
        <div>
          <p className="text-gray-600 mb-4">
            An OTP has been sent to <strong>{phone}</strong> via SMS.
            Enter it below to verify ownership.
          </p>
          <label className="block text-sm font-medium mb-1">Enter OTP</label>
          <input
            type="text"
            placeholder="123456"
            maxLength={6}
            value={otp}
            onChange={e => setOtp(e.target.value)}
            className="w-full border rounded px-3 py-2 mb-4 text-center text-2xl tracking-widest"
          />
          <button
            onClick={handleVerifyOTP}
            disabled={loading || otp.length < 6}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Verify OTP ✅'}
          </button>
        </div>
      )}

      {/* Step 3 — Test */}
      {step === 3 && (
        <div>
          <p className="text-gray-600 mb-4">
            ✅ Number verified! Let's send a test message to confirm everything works.
          </p>
          <button
            onClick={handleTest}
            disabled={loading}
            className="w-full bg-purple-600 text-white py-2 rounded hover:bg-purple-700"
          >
            {loading ? 'Sending...' : '📨 Send Test Message'}
          </button>
        </div>
      )}

      {/* Step 4 — Done */}
      {step === 4 && (
        <div className="text-center py-6">
          <div className="text-5xl mb-4">🎉</div>
          <h3 className="text-xl font-bold text-green-600">WhatsApp Connected!</h3>
          <p className="text-gray-600 mt-2">
            Parents will now receive messages from <strong>{phone}</strong>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            You have 1,000 free conversations per month.
          </p>
        </div>
      )}
    </div>
  )
}
```

---

## 9. Usage Tracking Dashboard {#tracking}

```jsx
// components/settings/WhatsAppUsage.jsx
export default function WhatsAppUsage({ tenantId }) {
  const [usage, setUsage] = useState(null)

  useEffect(() => {
    supabase
      .from('whatsapp_configs')
      .select('messages_sent_this_month, conversations_this_month, whatsapp_number, is_active')
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data }) => setUsage(data))
  }, [tenantId])

  const FREE_LIMIT = 1000
  const usagePercent = Math.min((usage?.conversations_this_month / FREE_LIMIT) * 100, 100)

  return (
    <div className="usage-card p-4 border rounded">
      <h3 className="font-semibold mb-3">📊 WhatsApp Usage This Month</h3>

      <div className="flex justify-between text-sm mb-1">
        <span>{usage?.conversations_this_month || 0} conversations used</span>
        <span>{FREE_LIMIT} free limit</span>
      </div>

      <div className="w-full bg-gray-200 rounded h-3 mb-3">
        <div
          className={`h-3 rounded ${usagePercent > 80 ? 'bg-red-500' : 'bg-green-500'}`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>

      {usagePercent > 80 && (
        <p className="text-red-500 text-sm">
          ⚠️ Approaching free limit. Upgrade to avoid interruption.
        </p>
      )}

      <p className="text-gray-500 text-xs mt-2">
        Connected number: {usage?.whatsapp_number}
      </p>
    </div>
  )
}
```

---

## 10. Security Best Practices {#security}

```
✅ Use ONE System User Token — stored only in your .env (server-side)
✅ Never expose WHATSAPP_SYSTEM_TOKEN to frontend/client
✅ Use SUPABASE_SERVICE_ROLE_KEY only on server-side API routes
✅ RLS policies ensure schools cannot access each other's configs
✅ Validate tenantId on every API call (match with authenticated user)
✅ Rate limit your API endpoints to prevent abuse
✅ Log all sent messages for audit trail
✅ Never store raw phone numbers — normalize format first
```

### Validate Tenant Ownership on Every API Call

```js
// middleware/validateTenant.js
export const validateTenantAccess = async (req, tenantId) => {
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profile.tenant_id !== tenantId) {
    throw new Error('Unauthorized: Tenant mismatch')
  }

  return profile
}

// Use in every WhatsApp API route:
const profile = await validateTenantAccess(req, tenantId)
```

---

## 11. Cost Breakdown {#cost}

### Per School Per Month

| School Size | Smart Usage (Attendance + Fee only) | Monthly Cost |
|---|---|---|
| 100 students | ~150 msgs | **PKR 0 — FREE** |
| 300 students | ~450 msgs | **PKR 0 — FREE** |
| 500 students | ~750 msgs | **PKR 0 — FREE** |
| 800 students | ~1,200 msgs | ~PKR 3,000 |
| 1000+ students | ~1,500 msgs | ~PKR 8,000 |

### Monetization Opportunity

```
Charge schools: PKR 1,500–3,000/month for WhatsApp feature
Your cost:      PKR 0 (under free tier for most schools)
Profit:         PKR 1,500–3,000 per school/month

At 20 schools = PKR 30,000–60,000/month pure profit
just from this one feature 💰
```

### Smart Usage Rules (Stay Under Free Tier)

```
✅ Attendance absent alerts  → WhatsApp
✅ Fee due reminders         → WhatsApp
❌ Daily announcements       → Email (free)
❌ Exam results              → In-app + Email (free)
❌ Welcome messages          → Email (free)
```

---

## 12. Environment Variables {#env}

```env
# .env.local — Server side only, never expose to client

# Meta WhatsApp
WHATSAPP_SYSTEM_TOKEN=your_permanent_system_user_token_here
WHATSAPP_BUSINESS_ACCOUNT_ID=your_business_account_id_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key   # server-side only!

# Encryption (exactly 32 characters)
ENCRYPTION_SECRET=your32characterencryptionkeyhere
```

---

## Complete Flow Summary

```
SETUP (One time — You)
────────────────────────────────────────
Create Meta Business App
→ Get Business Account ID
→ Create System User → Get Permanent Token
→ Verify Facebook Business Account
→ Save in .env

SCHOOL ONBOARDING (Per school)
────────────────────────────────────────
School Admin → Settings → WhatsApp Setup
→ Enters phone number
→ Your API registers number under YOUR Meta account
→ OTP sent to school's number
→ School enters OTP
→ Number verified → Phone Number ID saved in DB
→ WhatsApp active ✅

DAILY OPERATION (Automatic)
────────────────────────────────────────
Student marked absent
→ sendWhatsApp(tenantId, parentPhone, 'attendance_alert', [...])
→ Fetches school's Phone Number ID from DB
→ Sends via YOUR system token + THEIR number ID
→ Parent receives message from school's number ✅
→ Logged in notification_logs
→ Usage counter incremented
```

---

*Generated for SMS SaaS Platform — Multi-Tenant Educational SaaS*
*Last Updated: February 2026*
