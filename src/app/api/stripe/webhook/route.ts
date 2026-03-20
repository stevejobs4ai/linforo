import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

// The Stripe subscription type is versioned; period-end lives at billing_cycle_anchor
// in newer API versions. We extract it via a safe accessor.
function subscriptionEndDate(sub: Stripe.Subscription): string {
  // In the newer Stripe API the next billing date is billing_cycle_anchor
  // If the subscription is set to cancel at a future date, prefer that.
  const cancelAt = (sub as unknown as { cancel_at?: number | null }).cancel_at
  if (cancelAt) return new Date(cancelAt * 1000).toISOString()
  // billing_cycle_anchor is the anchor for the recurring billing date
  const anchor = sub.billing_cycle_anchor
  // Add 30 days as a conservative estimate for the next period end
  return new Date((anchor + 30 * 24 * 60 * 60) * 1000).toISOString()
}

export async function POST(req: NextRequest) {
  const sig = req.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

  let event: Stripe.Event
  try {
    const body = await req.arrayBuffer()
    event = stripe.webhooks.constructEvent(Buffer.from(body), sig!, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Webhook error: ${message}` }, { status: 400 })
  }

  const supabase = createServiceClient()

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const clerkId = session.metadata?.clerk_id
      const supabaseUserId = session.metadata?.supabase_user_id

      if (!clerkId || !supabaseUserId) break

      if (session.subscription) {
        const sub = await stripe.subscriptions.retrieve(session.subscription as string)
        await supabase
          .from('users')
          .update({ plan: 'premium', subscription_ends_at: subscriptionEndDate(sub) })
          .eq('id', supabaseUserId)
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!user) break

      const active = sub.status === 'active' || sub.status === 'trialing'

      await supabase
        .from('users')
        .update({
          plan: active ? 'premium' : 'free',
          subscription_ends_at: active ? subscriptionEndDate(sub) : null,
        })
        .eq('id', user.id)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      const customerId = sub.customer as string

      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('stripe_customer_id', customerId)
        .single()

      if (!user) break

      await supabase
        .from('users')
        .update({ plan: 'free', subscription_ends_at: null })
        .eq('id', user.id)
      break
    }
  }

  return NextResponse.json({ received: true })
}
