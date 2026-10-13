/**
 * StockSaathi AI — WhatsApp Clearance Campaign Service (Phase 9)
 *
 * Generates personalized, profit-safe WhatsApp promotional broadcasts
 * for slow-moving, at-risk, and critical dead-stock inventory.
 *
 * Integrates:
 * - Phase 5 MongoDB Product records
 * - Phase 6 Dead Stock classification and risk evidence
 * - Phase 7 Profit-Safe Discount Engine & Price Floors (P_min)
 *
 * Supported Languages: English, Hindi, Hinglish
 * Supported Tones: Friendly, Urgent, Professional
 * Supported Campaign Types: Flash Sale, Clearance, Bundle Offer, Near Expiry
 */

import mongoose from 'mongoose';
import Product from '../models/Product.model.js';
import Campaign from '../models/Campaign.model.js';
import { analyzeProduct } from './deadStock.service.js';
import {
  calculateMinimumPrice,
  recommendDiscountForProduct,
  round2,
} from './discount.service.js';

// ── Deterministic Copywriting Templates ───────────────────────────────────────

/**
 * Generates structured promotional messages based on language, tone, and campaign type.
 */
function buildCampaignMessage({
  productName,
  category,
  quantity,
  listPrice,
  proposedPrice,
  discountPercent,
  savingsAmount,
  campaignType,
  targetAudience,
  language,
  tone,
  callToAction,
  customInstructions,
}) {
  const hasDiscount = discountPercent > 0 && proposedPrice < listPrice;

  // 1. Audience Greeting
  const greetings = {
    english: {
      all_customers: 'Hello Valued Customer! 👋',
      repeat_customers: 'Special Greetings to our Preferred Shopper! 🌟',
      local_customers: 'Namaste Neighbor! Greetings from your neighborhood store! 🏪',
      custom: 'Special Greetings! ✨',
    },
    hindi: {
      all_customers: 'नमस्ते प्रिय ग्राहक! 🙏',
      repeat_customers: 'हमारे विशेष और नियमित ग्राहक के लिए खास नमस्कार! 🌟',
      local_customers: 'नमस्ते पड़ोसियों! आपकी अपनी नजदीकी दुकान से विशेष खबर! 🏪',
      custom: 'सादर नमस्कार! ✨',
    },
    hinglish: {
      all_customers: 'Hello Dear Customer! 👋',
      repeat_customers: 'Special Offer exclusively for our Loyal Customers! 🌟',
      local_customers: 'Namaste Neighbors! Aapki apni local shop se ek khaas update! 🏪',
      custom: 'Special Greetings! ✨',
    },
  };

  const selectedGreeting =
    greetings[language]?.[targetAudience] || greetings.english.all_customers;

  // 2. Campaign Headlines by Type & Language
  const headlines = {
    english: {
      flash_sale: '⚡ 48-HOUR EXCLUSIVE FLASH SALE ALERT ⚡',
      clearance: '🏷️ SPECIAL CLEARANCE DEAL — LIMITED STOCK 🏷️',
      bundle_offer: '🎁 EXCLUSIVE VALUE BUNDLE PROMOTION 🎁',
      near_expiry: '⏰ FRESH ARRIVAL VALUE DEAL — LIMITED WINDOW ⏰',
    },
    hindi: {
      flash_sale: '⚡ 48-घंटे की महा फ्लैश सेल ⚡',
      clearance: '🏷️ स्पेशल स्टॉक क्लीयरेंस ऑफर — सीमित स्टॉक 🏷️',
      bundle_offer: '🎁 खास बचत बंडल ऑफर 🎁',
      near_expiry: '⏰ सीमित समय का खास फ्रेश स्टॉक ऑफर ⏰',
    },
    hinglish: {
      flash_sale: '⚡ 48-HOURS KI MEGA FLASH SALE ⚡',
      clearance: '🏷️ SPECIAL STOCK CLEARANCE OFFER — LIMITED UNITS 🏷️',
      bundle_offer: '🎁 SUPER VALUE BUNDLE SAVINGS OFFER 🎁',
      near_expiry: '⏰ LIMITED TIME FRESH STOCK VALUE DEAL ⏰',
    },
  };

  const selectedHeadline =
    headlines[language]?.[campaignType] || headlines.english.flash_sale;

  // 3. Body Narrative by Tone & Language
  let narrative = '';

  if (language === 'english') {
    if (tone === 'urgent') {
      narrative = `Hurry! We are clearing a limited batch of our genuine *${productName}* (${category}). Only ${quantity} units are available at this special price before stock sells out completely!`;
    } else if (tone === 'professional') {
      narrative = `We are pleased to extend an exclusive retail purchasing opportunity on verified *${productName}* (${category}). Premium quality guaranteed with immediate in-store availability.`;
    } else {
      // friendly
      narrative = `We have an exciting treat for you! Treat yourself to the authentic *${productName}* (${category}) at an unbeatable celebratory rate.`;
    }
  } else if (language === 'hindi') {
    if (tone === 'urgent') {
      narrative = `जल्दी कीजिए! हमारे पास असली *${productName}* (${category}) के केवल ${quantity} यूनिट्स इस खास दाम पर उपलब्ध हैं। स्टॉक खत्म होने से पहले अपना ऑर्डर बुक करें!`;
    } else if (tone === 'professional') {
      narrative = `हम आपके लिए उच्च गुणवत्ता वाले *${productName}* (${category}) पर विशेष व्यावसायिक छूट पेश कर रहे हैं। विश्वसनीय गुणवत्ता और त्वरित डिलीवरी उपलब्ध है।`;
    } else {
      // friendly
      narrative = `आपके लिए एक बेहतरीन खुशखबरी! अब असली *${productName}* (${category}) पाइए बेहद किफायती और आकर्षक दाम पर।`;
    }
  } else {
    // hinglish
    if (tone === 'urgent') {
      narrative = `Jaldi kijiye! Hamare paas genuine *${productName}* (${category}) ke sirf ${quantity} units bache hain is special rate par. Stock khatam hone se pehle book karein!`;
    } else if (tone === 'professional') {
      narrative = `Ham aapke liye lekar aaye hain certified *${productName}* (${category}) par attractive pricing. 100% genuine quality ke saath immediate store pickup available hai.`;
    } else {
      // friendly
      narrative = `Aapke liye ek zabardast offer! Original *${productName}* (${category}) ab uplabdh hai super affordable daam par.`;
    }
  }

  // 4. Pricing Block
  let priceBlock = '';
  if (hasDiscount) {
    if (language === 'hindi') {
      priceBlock = `💰 *कीमत विवरण:*\n• असली दाम (MRP): ₹${listPrice.toLocaleString('en-IN')}\n• स्पेशल ऑफर मूल्य: *₹${proposedPrice.toLocaleString('en-IN')}*\n• आपकी कुल बचत: *₹${savingsAmount.toLocaleString('en-IN')} (${discountPercent}% की सीधी छूट)*`;
    } else if (language === 'hinglish') {
      priceBlock = `💰 *Price Details:*\n• Original Price: ₹${listPrice.toLocaleString('en-IN')}\n• Special Offer Price: *₹${proposedPrice.toLocaleString('en-IN')}*\n• Total Savings: *₹${savingsAmount.toLocaleString('en-IN')} (${discountPercent}% OFF)*`;
    } else {
      priceBlock = `💰 *Price Breakdown:*\n• Original Price: ₹${listPrice.toLocaleString('en-IN')}\n• Special Clearance Price: *₹${proposedPrice.toLocaleString('en-IN')}*\n• You Save: *₹${savingsAmount.toLocaleString('en-IN')} (${discountPercent}% OFF)*`;
    }
  } else {
    if (language === 'hindi') {
      priceBlock = `💰 *विशेष स्टोर मूल्य: ₹${proposedPrice.toLocaleString('en-IN')}*\n(सीमित स्टॉक • विशेष प्राथमिकता)`;
    } else if (language === 'hinglish') {
      priceBlock = `💰 *Special Store Price: ₹${proposedPrice.toLocaleString('en-IN')}*\n(Limited Stock Available • High Priority)`;
    } else {
      priceBlock = `💰 *Special Store Price: ₹${proposedPrice.toLocaleString('en-IN')}*\n(Limited Stock Available • Exclusive Priority)`;
    }
  }

  // 5. Call To Action & Signoff
  let ctaText = callToAction || 'Reply to reserve or visit our store today!';
  if (language === 'hindi' && !callToAction) {
    ctaText = 'ऑर्डर आरक्षित करने के लिए अभी रिप्लाई करें या आज ही दुकान पर पधारें!';
  } else if (language === 'hinglish' && !callToAction) {
    ctaText = 'Book karne ke liye abhi reply karein ya aaj hi shop par visit karein!';
  }

  let fullMessage = `${selectedGreeting}\n\n${selectedHeadline}\n\n${narrative}\n\n${priceBlock}\n\n📍 *How to Avail:*\n${ctaText}`;

  if (customInstructions && customInstructions.trim()) {
    fullMessage += `\n\n📌 *Special Note:* ${customInstructions.trim()}`;
  }

  return fullMessage;
}

// ── Campaign Generation Service ───────────────────────────────────────────────

/**
 * Generates a profit-safe WhatsApp clearance campaign for an active product.
 *
 * @param {object} params
 * @param {string} params.productId - MongoDB ObjectId
 * @param {string} params.campaignType - flash_sale | clearance | bundle_offer | near_expiry
 * @param {string} [params.targetAudience='all_customers']
 * @param {string} [params.language='english']
 * @param {string} [params.tone='friendly']
 * @param {number} [params.discountPercent] - Optional requested discount
 * @param {string} [params.customInstructions]
 * @param {string} [params.campaignName]
 * @param {Date} [referenceDate=new Date()]
 * @returns {Promise<object>} Saved Campaign document with analysis metadata
 */
export async function generateCampaign(params = {}, referenceDate = new Date(), merchantId = null) {
  // Handle polymorphic overload where 2nd argument is merchantId: generateCampaign(params, merchantId)
  if (
    referenceDate instanceof mongoose.Types.ObjectId ||
    (typeof referenceDate === 'string' && mongoose.Types.ObjectId.isValid(referenceDate) && isNaN(Date.parse(referenceDate)))
  ) {
    merchantId = referenceDate;
    referenceDate = new Date();
  } else if (referenceDate && !(referenceDate instanceof Date) && isNaN(Date.parse(referenceDate))) {
    merchantId = referenceDate;
    referenceDate = new Date();
  }

  const {
    productId,
    campaignType,
    targetAudience = 'all_customers',
    language = 'english',
    tone = 'friendly',
    discountPercent: requestedDiscount,
    customInstructions,
    campaignName: customName,
  } = params;

  if (!productId || !mongoose.Types.ObjectId.isValid(productId)) {
    const err = new Error('Valid productId is required');
    err.statusCode = 400;
    throw err;
  }

  const productQuery = { _id: productId };
  if (merchantId) {
    productQuery.merchantId = merchantId;
  }
  const product = await Product.findOne(productQuery);
  if (!product) {
    const err = new Error(`Product with ID "${productId}" not found`);
    err.statusCode = 404;
    throw err;
  }

  const P = product.sellingPrice;
  const C = product.purchaseCost;
  const Q = product.quantity;

  // 1. Phase 6 Dead Stock Analysis
  const deadStockAnalysis = analyzeProduct(product, referenceDate);

  // 2. Phase 7 Profit Floors Calculation
  let minimumSafePrice = 0;
  let maxSafeDiscountPercent = 0;
  let recommendedDiscount = 0;

  try {
    const floor = calculateMinimumPrice({
      purchaseCost: C,
      variableCostPerUnit: 0,
      constraintType: product.minimumDesiredProfitPerUnit > 0 ? 'minimum_profit' : 'minimum_margin',
      minimumDesiredProfitPerUnit: product.minimumDesiredProfitPerUnit || 0,
      minimumGrossMarginPercent: product.minimumGrossMarginPercent || 15,
      currentSellingPrice: P,
    });
    minimumSafePrice = floor.minimumAcceptablePrice;
    maxSafeDiscountPercent = floor.maximumSafeDiscountPercent;
  } catch {
    minimumSafePrice = round2(C * 1.05);
    maxSafeDiscountPercent = P > minimumSafePrice ? round2((1 - minimumSafePrice / P) * 100) : 0;
  }

  try {
    const rec = await recommendDiscountForProduct({
      productId: product._id,
      quantity: Q > 0 ? Q : 1,
    });
    recommendedDiscount = rec?.recommendation?.recommendedDiscountPercent ?? 0;
  } catch {
    recommendedDiscount = Math.min(maxSafeDiscountPercent, 15);
  }

  // 3. Evaluate Requested Discount Safety
  let effectiveDiscount = 0;
  let proposedSellingPrice = P;

  if (requestedDiscount !== undefined && requestedDiscount !== null && requestedDiscount !== '') {
    const reqD = Number(requestedDiscount);

    if (reqD === 0) {
      // Non-discount promotional campaign: preserves current list price without price cutting
      effectiveDiscount = 0;
      proposedSellingPrice = P;
    } else {
      const calculatedProposed = round2(P * (1 - reqD / 100));

      // Reject if proposed price violates profit floor
      if (calculatedProposed < minimumSafePrice || reqD > maxSafeDiscountPercent) {
        const err = new Error(
          `Requested discount of ${reqD}% violates profit safeguards. Maximum safe discount for ${product.name} is ${maxSafeDiscountPercent}%, with a minimum price floor of ₹${minimumSafePrice.toFixed(2)}.`
        );
        err.statusCode = 400;
        err.safetyDetails = {
          requestedDiscountPercent: reqD,
          maximumSafeDiscountPercent: maxSafeDiscountPercent,
          minimumSafePrice: minimumSafePrice,
          listPrice: P,
          purchaseCost: C,
        };
        throw err;
      }

      effectiveDiscount = reqD;
      proposedSellingPrice = calculatedProposed;
    }
  } else {
    // Use Phase 7 safe recommendation
    effectiveDiscount = Math.min(recommendedDiscount, maxSafeDiscountPercent);
    if (effectiveDiscount <= 0 || maxSafeDiscountPercent <= 0) {
      effectiveDiscount = 0;
      proposedSellingPrice = P;
    } else {
      proposedSellingPrice = round2(P * (1 - effectiveDiscount / 100));
      if (proposedSellingPrice < minimumSafePrice) {
        proposedSellingPrice = minimumSafePrice;
        effectiveDiscount = round2((1 - proposedSellingPrice / P) * 100);
      }
    }
  }

  const savingsAmount = round2(P - proposedSellingPrice);

  // 4. Default Campaign Title
  const campaignName =
    customName && customName.trim()
      ? customName.trim()
      : `${product.name} — ${campaignType.replace(/_/g, ' ').toUpperCase()}`;

  const callToAction = 'Reply to reserve or visit our store today!';

  // 5. Generate Deterministic Promotional Message
  const message = buildCampaignMessage({
    productName: product.name,
    category: product.category || 'General',
    quantity: Q,
    listPrice: P,
    proposedPrice: proposedSellingPrice,
    discountPercent: effectiveDiscount,
    savingsAmount,
    campaignType,
    targetAudience,
    language,
    tone,
    callToAction,
    customInstructions,
  });

  // 6. Save Campaign to MongoDB Atlas
  const campaign = new Campaign({
    merchantId: merchantId || null,
    campaignName,
    campaignType,
    productId: product._id,
    productSnapshot: {
      name: product.name,
      sku: product.sku,
      category: product.category,
      quantity: Q,
      sellingPrice: P,
      purchaseCost: C,
    },
    targetAudience,
    language,
    tone,
    discountPercent: effectiveDiscount,
    proposedSellingPrice,
    minimumSafePrice,
    message,
    callToAction,
    status: 'draft',
  });

  const saved = await campaign.save();

  return {
    campaign: saved.toObject(),
    financialBreakdown: {
      purchaseCost: C,
      listPrice: P,
      proposedSellingPrice,
      savingsAmount,
      discountPercent: effectiveDiscount,
      minimumSafePrice,
      maximumSafeDiscountPercent: maxSafeDiscountPercent,
      isProfitSafe:
        proposedSellingPrice >= minimumSafePrice ||
        (effectiveDiscount === 0 && proposedSellingPrice >= C),
    },
    riskClassification: {
      classification: deadStockAnalysis.classification?.key || 'unknown',
      severity: deadStockAnalysis.severity || 'Medium',
      riskScore: deadStockAnalysis.riskScore || 0,
      reasonCodes: deadStockAnalysis.reasonCodes || [],
    },
  };
}

// ── Query Campaigns with Pagination & Filters ─────────────────────────────────

/**
 * Retrieves paginated list of campaigns with optional filters.
 */
export async function getCampaigns(query = {}, merchantId = null) {
  const {
    page = 1,
    limit = 10,
    status,
    campaignType,
    language,
    productId,
  } = query;

  const filter = {};
  if (merchantId) filter.merchantId = merchantId;
  if (status) filter.status = status;
  if (campaignType) filter.campaignType = campaignType;
  if (language) filter.language = language;
  if (productId) filter.productId = productId;

  const parsedPage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (parsedPage - 1) * parsedLimit;

  const [total, data] = await Promise.all([
    Campaign.countDocuments(filter),
    Campaign.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit)
      .lean(),
  ]);

  return {
    data,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit) || 1,
    },
  };
}

// ── Retrieve Single Campaign ──────────────────────────────────────────────────

/**
 * Retrieves a single campaign by ObjectId scoped to merchant.
 */
export async function getCampaignById(id, merchantId = null) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Valid campaign ID is required');
    err.statusCode = 400;
    throw err;
  }

  const query = { _id: id };
  if (merchantId) query.merchantId = merchantId;
  const campaign = await Campaign.findOne(query).lean();
  return campaign;
}

// ── Update Campaign ───────────────────────────────────────────────────────────

/**
 * Safely updates campaign fields (message, callToAction, audience, tone, status, discount).
 * Revalidates price floor if discountPercent changes.
 */
export async function updateCampaign(id, updateData = {}, merchantId = null) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Valid campaign ID is required');
    err.statusCode = 400;
    throw err;
  }

  const query = { _id: id };
  if (merchantId) query.merchantId = merchantId;
  const campaign = await Campaign.findOne(query);
  if (!campaign) {
    return null;
  }

  // If discountPercent changes, revalidate against minimumSafePrice
  if (
    updateData.discountPercent !== undefined &&
    updateData.discountPercent !== null &&
    updateData.discountPercent !== ''
  ) {
    const newDiscount = Number(updateData.discountPercent);
    const P = campaign.productSnapshot.sellingPrice;
    const newProposed = round2(P * (1 - newDiscount / 100));

    if (newProposed < campaign.minimumSafePrice) {
      const err = new Error(
        `Updated discount of ${newDiscount}% violates the minimum safe price floor of ₹${campaign.minimumSafePrice.toFixed(2)}.`
      );
      err.statusCode = 400;
      throw err;
    }

    campaign.discountPercent = newDiscount;
    campaign.proposedSellingPrice = newProposed;
  }

  if (updateData.message !== undefined && updateData.message !== null) {
    campaign.message = String(updateData.message).trim();
  }

  if (updateData.callToAction !== undefined && updateData.callToAction !== null) {
    campaign.callToAction = String(updateData.callToAction).trim();
  }

  if (updateData.targetAudience) campaign.targetAudience = updateData.targetAudience;
  if (updateData.tone) campaign.tone = updateData.tone;
  if (updateData.status) campaign.status = updateData.status;
  if (updateData.campaignName) campaign.campaignName = updateData.campaignName.trim();

  await campaign.save();
  return campaign.toObject();
}

// ── Archive Campaign ──────────────────────────────────────────────────────────

/**
 * Archives a campaign without deleting historical records.
 */
export async function archiveCampaign(id, merchantId = null) {
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    const err = new Error('Valid campaign ID is required');
    err.statusCode = 400;
    throw err;
  }

  const query = { _id: id };
  if (merchantId) query.merchantId = merchantId;
  const campaign = await Campaign.findOne(query);
  if (!campaign) {
    return null;
  }

  campaign.status = 'archived';
  await campaign.save();
  return campaign.toObject();
}
