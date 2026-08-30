// enterprise-ai-agent-platform/apps/api/src/scripts/setup-stripe-products.ts
/**
 * Stripe Product Setup Script — Updated Pricing 2025
 * 
 * Run this script to create products and prices in Stripe:
 * npx ts-node src/scripts/setup-stripe-products.ts
 * 
 * This will create:
 * - Products for each plan (Starter, Professional, Enterprise)
 * - Monthly and yearly prices for each plan
 * - Usage-based metered prices for overages
 * - Test coupon for development
 */

import Stripe from 'stripe';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

interface PlanConfig {
  name: string;
  description: string;
  monthlyPrice: number; // in cents
  yearlyPrice: number; // in cents (20% discount)
  features: string[];
  metadata: Record<string, string>;
  limits: {
    aiActions: number;
    apiCalls: number;
    teamMembers: number;
    storageGB: number;
  };
}

// ============================================
// Updated Pricing Plans — 2025
// ============================================

const PLANS: Record<string, PlanConfig> = {
  STARTER: {
    name: 'Starter',
    description: 'For individuals and small teams — 500 AI actions, 2,000 API calls/month',
    monthlyPrice: 3900, // $39.00
    yearlyPrice: 37440, // $374.40 ($31.20/month, 20% off)
    features: [
      '500 AI Actions per month',
      '2,000 API Calls per month',
      'Email, Calendar, Web Agents',
      'Drive Agent',
      'Social Media Posting',
      'Task Agent',
      'Priority Support',
    ],
    metadata: {
      plan_type: 'starter',
      ai_actions_limit: '500',
      api_calls_limit: '2000',
      team_members: '3',
      storage_gb: '1',
      overage_ai_action: '0.05',
      overage_api_call: '0.01',
    },
    limits: {
      aiActions: 500,
      apiCalls: 2000,
      teamMembers: 3,
      storageGB: 1,
    },
  },
  PROFESSIONAL: {
    name: 'Professional',
    description: 'For growing businesses — 2,500 AI actions, 15,000 API calls/month',
    monthlyPrice: 12900, // $129.00
    yearlyPrice: 123840, // $1,238.40 ($103.20/month, 20% off)
    features: [
      '2,500 AI Actions per month',
      '15,000 API Calls per month',
      'All Starter features',
      'Image Generation',
      'Multi-platform Posts',
      'API Access',
      'Email Support',
    ],
    metadata: {
      plan_type: 'professional',
      ai_actions_limit: '2500',
      api_calls_limit: '15000',
      team_members: '10',
      storage_gb: '10',
      overage_ai_action: '0.05',
      overage_api_call: '0.01',
      overage_image: '0.10',
    },
    limits: {
      aiActions: 2500,
      apiCalls: 15000,
      teamMembers: 10,
      storageGB: 10,
    },
  },
  ENTERPRISE: {
    name: 'Enterprise',
    description: 'For large organizations — 10,000 AI actions, 50,000 API calls/month',
    monthlyPrice: 59900, // $599.00
    yearlyPrice: 575040, // $5,750.40 ($479.20/month, 20% off)
    features: [
      '10,000 AI Actions per month',
      '50,000 API Calls per month',
      'All Professional features',
      'Video Generation',
      'White-label',
      'Custom Integrations',
      'SLA Guarantee',
      '24/7 Phone Support',
      'Dedicated Account Manager',
    ],
    metadata: {
      plan_type: 'enterprise',
      ai_actions_limit: '10000',
      api_calls_limit: '50000',
      team_members: '100',
      storage_gb: '100',
      overage_ai_action: '0.02',
      overage_api_call: '0.005',
      overage_image: '0.05',
      overage_video: '0.50',
    },
    limits: {
      aiActions: 10000,
      apiCalls: 50000,
      teamMembers: 100,
      storageGB: 100,
    },
  },
};

// ============================================
// Metered Overage Prices
// ============================================

const METERED_PRICES = [
  {
    name: 'AI Actions Overage (Starter/Professional)',
    description: 'Additional AI actions beyond Starter or Professional plan limits',
    unitAmount: 5, // $0.05 per action (in cents)
    currency: 'usd',
    metadata: {
      usage_type: 'ai_actions_overage',
      applicable_plans: 'starter,professional',
      unit_label: 'per AI action',
    },
  },
  {
    name: 'AI Actions Overage (Enterprise)',
    description: 'Additional AI actions beyond Enterprise plan limits',
    unitAmount: 2, // $0.02 per action (in cents)
    currency: 'usd',
    metadata: {
      usage_type: 'ai_actions_overage_enterprise',
      applicable_plans: 'enterprise',
      unit_label: 'per AI action',
    },
  },
  {
    name: 'API Calls Overage (Starter/Professional)',
    description: 'Additional API calls beyond Starter or Professional plan limits',
    unitAmount: 1, // $0.01 per call (in cents)
    currency: 'usd',
    metadata: {
      usage_type: 'api_calls_overage',
      applicable_plans: 'starter,professional',
      unit_label: 'per API call',
    },
  },
  {
    name: 'API Calls Overage (Enterprise)',
    description: 'Additional API calls beyond Enterprise plan limits',
    unitAmount: 0.5, // $0.005 per call (0.5 cents)
    currency: 'usd',
    metadata: {
      usage_type: 'api_calls_overage_enterprise',
      applicable_plans: 'enterprise',
      unit_label: 'per API call',
    },
  },
  {
    name: 'Image Generation Overage',
    description: 'Additional image generations beyond plan limits',
    unitAmount: 10, // $0.10 per image (in cents)
    currency: 'usd',
    metadata: {
      usage_type: 'image_generation_overage',
      applicable_plans: 'professional,enterprise',
      unit_label: 'per image',
    },
  },
  {
    name: 'Video Generation Overage',
    description: 'Additional video generations beyond plan limits',
    unitAmount: 100, // $1.00 per video (in cents)
    currency: 'usd',
    metadata: {
      usage_type: 'video_generation_overage',
      applicable_plans: 'enterprise',
      unit_label: 'per video',
    },
  },
];

// ============================================
// Setup Function
// ============================================

async function setupStripeProducts() {
  console.log('🚀 Starting Stripe product setup with 2025 pricing...\n');
  console.log('📊 New Pricing:');
  console.log('   Starter:      $39/month  ($374.40/year)');
  console.log('   Professional: $129/month ($1,238.40/year)');
  console.log('   Enterprise:   $599/month ($5,750.40/year)\n');
  
  const results: Record<string, any> = {};
  
  // ============================================
  // Create Plan Products
  // ============================================
  
  for (const [planId, planConfig] of Object.entries(PLANS)) {
    console.log(`📦 Creating product for ${planConfig.name} ($${(planConfig.monthlyPrice / 100).toFixed(2)}/mo)...`);
    
    // Check for existing product
    const activeProducts = await stripe.products.list({
      active: true,
      limit: 100,
    });
    const existingProducts = {
      data: activeProducts.data.filter(
        (p) => p.metadata?.plan_type === planId.toLowerCase()
      ),
    };
    
    let productId: string;
    
    if (existingProducts.data.length > 0) {
      productId = existingProducts.data[0].id;
      
      // Update existing product with new metadata
      await stripe.products.update(productId, {
        name: planConfig.name,
        description: planConfig.description,
        metadata: {
          plan_type: planId.toLowerCase(),
          ...planConfig.metadata,
        },
      });
      
      console.log(`  ✅ Updated existing product: ${productId}`);
    } else {
      const newProduct = await stripe.products.create({
        name: planConfig.name,
        description: planConfig.description,
        metadata: {
          plan_type: planId.toLowerCase(),
          ...planConfig.metadata,
        },
      });
      productId = newProduct.id;
      console.log(`  ✅ Created product: ${productId}`);
    }
    
    results[planId] = { productId, prices: {} };
    
    // ============================================
    // Create Monthly Price
    // ============================================
    
    console.log(`  💰 Creating monthly price ($${(planConfig.monthlyPrice / 100).toFixed(2)}/mo)...`);
    
    const existingMonthlyPrices = await stripe.prices.list({
      product: productId,
      recurring: { interval: 'month' },
      active: true,
      limit: 1,
    });
    
    let monthlyPriceId: string;
    
    if (existingMonthlyPrices.data.length > 0) {
      const existingPrice = existingMonthlyPrices.data[0];
      
      // If price changed, create new one and deactivate old
      if (existingPrice.unit_amount !== planConfig.monthlyPrice) {
        await stripe.prices.update(existingPrice.id, { active: false });
        
        const newMonthlyPrice = await stripe.prices.create({
          product: productId,
          unit_amount: planConfig.monthlyPrice,
          currency: 'usd',
          recurring: {
            interval: 'month',
            usage_type: 'licensed',
          },
          metadata: {
            plan_id: planId,
            interval: 'month',
          },
        });
        monthlyPriceId = newMonthlyPrice.id;
        console.log(`  ✅ Created new monthly price: ${monthlyPriceId} ($${(planConfig.monthlyPrice / 100).toFixed(2)})`);
      } else {
        monthlyPriceId = existingPrice.id;
        console.log(`  ✅ Using existing monthly price: ${monthlyPriceId}`);
      }
    } else {
      const newMonthlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: planConfig.monthlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'month',
          usage_type: 'licensed',
        },
        metadata: {
          plan_id: planId,
          interval: 'month',
        },
      });
      monthlyPriceId = newMonthlyPrice.id;
      console.log(`  ✅ Created monthly price: ${monthlyPriceId}`);
    }
    
    results[planId].prices.monthly = monthlyPriceId;
    
    // ============================================
    // Create Yearly Price
    // ============================================
    
    console.log(`  💰 Creating yearly price ($${(planConfig.yearlyPrice / 100).toFixed(2)}/yr)...`);
    
    const existingYearlyPrices = await stripe.prices.list({
      product: productId,
      recurring: { interval: 'year' },
      active: true,
      limit: 1,
    });
    
    let yearlyPriceId: string;
    
    if (existingYearlyPrices.data.length > 0) {
      const existingPrice = existingYearlyPrices.data[0];
      
      if (existingPrice.unit_amount !== planConfig.yearlyPrice) {
        await stripe.prices.update(existingPrice.id, { active: false });
        
        const newYearlyPrice = await stripe.prices.create({
          product: productId,
          unit_amount: planConfig.yearlyPrice,
          currency: 'usd',
          recurring: {
            interval: 'year',
            usage_type: 'licensed',
          },
          metadata: {
            plan_id: planId,
            interval: 'year',
          },
        });
        yearlyPriceId = newYearlyPrice.id;
        console.log(`  ✅ Created new yearly price: ${yearlyPriceId} ($${(planConfig.yearlyPrice / 100).toFixed(2)})`);
      } else {
        yearlyPriceId = existingPrice.id;
        console.log(`  ✅ Using existing yearly price: ${yearlyPriceId}`);
      }
    } else {
      const newYearlyPrice = await stripe.prices.create({
        product: productId,
        unit_amount: planConfig.yearlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'year',
          usage_type: 'licensed',
        },
        metadata: {
          plan_id: planId,
          interval: 'year',
        },
      });
      yearlyPriceId = newYearlyPrice.id;
      console.log(`  ✅ Created yearly price: ${yearlyPriceId}`);
    }
    
    results[planId].prices.yearly = yearlyPriceId;
    
    console.log('');
  }
  
  // ============================================
  // Create Metered Overage Prices
  // ============================================
  
  console.log('📊 Creating metered overage prices...\n');
  
  const meteredResults: Record<string, string> = {};
  
  for (const meteredPrice of METERED_PRICES) {
    console.log(`  💰 Creating metered price: ${meteredPrice.name} ($${(meteredPrice.unitAmount / 100).toFixed(2)}/unit)...`);
    
    // Check for existing metered price
    const activeMeteredPrices = await stripe.prices.list({
      active: true,
      limit: 100,
    });
    const existingMeteredPrices = {
      data: activeMeteredPrices.data.filter(
        (p) => p.metadata?.usage_type === meteredPrice.metadata.usage_type
      ),
    };
    
    let priceId: string;
    
    if (existingMeteredPrices.data.length > 0) {
      const existingPrice = existingMeteredPrices.data[0];
      
      if (existingPrice.unit_amount !== meteredPrice.unitAmount) {
        await stripe.prices.update(existingPrice.id, { active: false });
        
        const newMeteredPrice = await stripe.prices.create({
          unit_amount: meteredPrice.unitAmount,
          currency: meteredPrice.currency,
          recurring: {
            interval: 'month',
            usage_type: 'metered',
            aggregate_usage: 'sum',
          },
          product_data: {
            name: meteredPrice.name,
            metadata: { ...meteredPrice.metadata, description: meteredPrice.description },
          },
          metadata: meteredPrice.metadata,
        });
        priceId = newMeteredPrice.id;
        console.log(`  ✅ Created new metered price: ${priceId}`);
      } else {
        priceId = existingPrice.id;
        console.log(`  ✅ Using existing metered price: ${priceId}`);
      }
    } else {
      const newMeteredPrice = await stripe.prices.create({
        unit_amount: meteredPrice.unitAmount,
        currency: meteredPrice.currency,
        recurring: {
          interval: 'month',
          usage_type: 'metered',
          aggregate_usage: 'sum',
        },
        product_data: {
          name: meteredPrice.name,
          metadata: { ...meteredPrice.metadata, description: meteredPrice.description },
        },
        metadata: meteredPrice.metadata,
      });
      priceId = newMeteredPrice.id;
      console.log(`  ✅ Created metered price: ${priceId}`);
    }
    
    meteredResults[meteredPrice.metadata.usage_type] = priceId;
    console.log('');
  }
  
  // ============================================
  // Create Test Coupons
  // ============================================
  
  console.log('🎫 Creating test coupons...\n');
  
  const coupons = [
    { percent_off: 50, duration: 'once' as const, name: 'LAUNCH50 - 50% off first month' },
    { percent_off: 20, duration: 'forever' as const, name: 'ANNUAL20 - 20% off forever (annual billing)', max_redemptions: 1000 },
    { amount_off: 1000, duration: 'once' as const, currency: 'usd', name: 'SAVE10 - $10 off' },
  ];
  
  for (const couponConfig of coupons) {
    try {
      const coupon = await stripe.coupons.create({
        ...couponConfig,
        metadata: {
          purpose: 'testing',
          created_by: 'setup-stripe-products-script',
        },
      });
      console.log(`  ✅ Created coupon: ${coupon.id} (${couponConfig.name})`);
    } catch (error: any) {
      if (error.message?.includes('already exists')) {
        console.log(`  ⚠️  Coupon "${couponConfig.name}" already exists`);
      } else {
        console.log(`  ❌ Failed to create coupon: ${error.message}`);
      }
    }
  }
  
  // ============================================
  // Output Results
  // ============================================
  
  console.log('\n' + '='.repeat(70));
  console.log('✅ Stripe Product Setup Complete — 2025 Pricing!');
  console.log('='.repeat(70));
  console.log('\n📋 Add these to your .env file:\n');
  
  for (const [planId, result] of Object.entries(results)) {
    const planConfig = PLANS[planId];
    console.log(`# ${planId} Plan — $${(planConfig.monthlyPrice / 100).toFixed(2)}/month`);
    console.log(`STRIPE_${planId}_PRODUCT_ID=${result.productId}`);
    console.log(`STRIPE_${planId}_MONTHLY_PRICE_ID=${result.prices.monthly}`);
    console.log(`STRIPE_${planId}_YEARLY_PRICE_ID=${result.prices.yearly}`);
    console.log('');
  }
  
  console.log('# Metered Overage Prices');
  for (const [usageType, priceId] of Object.entries(meteredResults)) {
    const envKey = `STRIPE_${usageType.toUpperCase()}_PRICE_ID`;
    console.log(`${envKey}=${priceId}`);
  }
  console.log('');
  
  // ============================================
  // Summary
  // ============================================
  
  console.log('📊 Pricing Summary:');
  console.log('┌──────────────┬──────────┬────────────┬──────────────────┐');
  console.log('│ Plan         │ Monthly  │ Yearly     │ Overage AI/API   │');
  console.log('├──────────────┼──────────┼────────────┼──────────────────┤');
  console.log('│ Starter      │ $39.00   │ $374.40    │ $0.05 / $0.01    │');
  console.log('│ Professional │ $129.00  │ $1,238.40  │ $0.05 / $0.01    │');
  console.log('│ Enterprise   │ $599.00  │ $5,750.40  │ $0.02 / $0.005   │');
  console.log('└──────────────┴──────────┴────────────┴──────────────────┘');
  console.log('');
  console.log('✨ Setup complete! You can now use these price IDs in your application.');
  console.log('📝 Remember to update your .env file with the new price IDs above.');
}

// Run the setup
setupStripeProducts()
  .then(() => {
    console.log('\n🎉 Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Setup failed:', error);
    process.exit(1);
  });