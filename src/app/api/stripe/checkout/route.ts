import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-02-25.clover' })

const PLANS = {
  monthly: { priceId: process.env.STRIPE_MONTHLY_PRICE_ID ?? 'price_monthly_placeholder', amount: 999 },
  yearly: { priceId: process.env.STRIPE_YEARLY_PRICE_ID ?? 'price_yearly_placeholder', amount: 7999 },
}

export async function POST(req: NextRequest) {
  const { clerkId, plan = 'monthly', successUrl, cancelUrl } = await req.json()

  if (!clerkId) {
    return NextResponse.json({ error: 'clerkId required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Look up or create Stripe customer
  const { data: user } = await supabase
    .from('users')
    .select('id, stripe_customer_id, display_name')
    .eq('clerk_id', clerkId)
    .single()

  if (!user) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  let customerId = user.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      metadata: { clerk_id: clerkId, supabase_user_id: user.id },
    })
    customerId = customer.id
    await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id)
  }

  const selectedPlan = PLANS[plan as keyof typeof PLANS] ?? PLANS.monthly

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: selectedPlan.priceId,
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: successUrl ?? `${req.headers.get('origin')}/profile?upgraded=1`,
    cancel_url: cancelUrl ?? `${req.headers.get('origin')}/pricing`,
    metadata: { clerk_id: clerkId, supabase_user_id: user.id },
  })

  return NextResponse.json({ url: session.url })
}
