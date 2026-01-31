import { getUncachableStripeClient } from './stripeClient';

async function seedProducts() {
  const stripe = await getUncachableStripeClient();

  console.log('Checking existing products...');

  const existingProducts = await stripe.products.search({ query: "active:'true'" });
  const productNames = existingProducts.data.map(p => p.name);

  if (!productNames.includes('Peace+')) {
    console.log('Creating Peace+ product...');
    const peacePlusProduct = await stripe.products.create({
      name: 'Peace+',
      description: 'Enhanced practice experience with 50 AI analyses per day, all practice categories, voice coaching basics, and 2x Peace Points.',
      metadata: {
        tier: 'peace_plus',
        analyses_per_day: '50',
        peace_points_multiplier: '2',
      },
    });

    await stripe.prices.create({
      product: peacePlusProduct.id,
      unit_amount: 499,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: {
        tier: 'peace_plus',
      },
    });

    console.log('Peace+ product created:', peacePlusProduct.id);
  } else {
    console.log('Peace+ product already exists');
  }

  if (!productNames.includes('Pro Mind')) {
    console.log('Creating Pro Mind product...');
    const proMindProduct = await stripe.products.create({
      name: 'Pro Mind',
      description: 'Ultimate communication mastery with unlimited AI analyses, voice cloning & coaching, all cosmetics unlocked, 5x Peace Points, and priority support.',
      metadata: {
        tier: 'pro_mind',
        analyses_per_day: 'unlimited',
        peace_points_multiplier: '5',
      },
    });

    await stripe.prices.create({
      product: proMindProduct.id,
      unit_amount: 999,
      currency: 'usd',
      recurring: { interval: 'month' },
      metadata: {
        tier: 'pro_mind',
      },
    });

    console.log('Pro Mind product created:', proMindProduct.id);
  } else {
    console.log('Pro Mind product already exists');
  }

  console.log('Product seeding complete!');
}

seedProducts().catch(console.error);
