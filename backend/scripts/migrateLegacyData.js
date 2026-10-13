/**
 * StockSaathi AI — Legacy Data Migration & Merchant Owner Assignment (Phase 11)
 *
 * Scans, audits, backs up, and safely assigns unowned legacy records
 * (products, recovery plans, campaigns) to an explicit, administrator-approved merchant.
 *
 * Usage:
 *   node scripts/migrateLegacyData.js --status
 *   node scripts/migrateLegacyData.js --dry-run --assign-to merchant@example.com
 *   node scripts/migrateLegacyData.js --assign-to merchant@example.com
 */

import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { connectDB, disconnectDB } from '../config/db.js';
import Merchant from '../models/Merchant.model.js';
import Product from '../models/Product.model.js';
import RecoveryPlan from '../models/RecoveryPlan.model.js';
import Campaign from '../models/Campaign.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const args = process.argv.slice(2);
  const isStatusOnly = args.includes('--status');
  const isDryRun = args.includes('--dry-run');
  const assignToIndex = args.indexOf('--assign-to');
  const targetEmail = assignToIndex !== -1 ? args[assignToIndex + 1] : null;

  console.log('===============================================================');
  console.log('StockSaathi AI — Legacy Data Audit & Tenant Migration Utility');
  console.log('===============================================================\n');

  await connectDB();

  try {
    // 1. Audit unassigned records
    const unassignedProducts = await Product.find({
      $or: [{ merchantId: null }, { merchantId: { $exists: false } }],
    }).lean();

    const unassignedPlans = await RecoveryPlan.find({
      $or: [{ merchantId: null }, { merchantId: { $exists: false } }],
    }).lean();

    const unassignedCampaigns = await Campaign.find({
      $or: [{ merchantId: null }, { merchantId: { $exists: false } }],
    }).lean();

    console.log(`[Audit Findings]`);
    console.log(`- Unassigned Products:       ${unassignedProducts.length}`);
    console.log(`- Unassigned Recovery Plans: ${unassignedPlans.length}`);
    console.log(`- Unassigned Campaigns:      ${unassignedCampaigns.length}`);
    console.log('---------------------------------------------------------------');

    if (isStatusOnly) {
      console.log('\nStatus check complete. No changes made to database.');
      return;
    }

    if (!targetEmail) {
      console.log('\n[NOTICE] To assign these records to a verified merchant, run:');
      console.log('  node scripts/migrateLegacyData.js --assign-to <merchant-email>');
      console.log('Or preview changes without applying:');
      console.log('  node scripts/migrateLegacyData.js --dry-run --assign-to <merchant-email>\n');
      return;
    }

    // 2. Validate target merchant
    const merchant = await Merchant.findOne({ email: targetEmail.toLowerCase().trim() });
    if (!merchant) {
      console.error(`\n[ERROR] Target merchant with email "${targetEmail}" was NOT found.`);
      console.error('Please create or register the merchant before running migration.');
      process.exitCode = 1;
      return;
    }

    console.log(`\n[Target Merchant Verified]`);
    console.log(`- Merchant ID:   ${merchant._id}`);
    console.log(`- Name:          ${merchant.name}`);
    console.log(`- Email:         ${merchant.email}`);
    console.log(`- Business Name: ${merchant.businessName}`);

    if (isDryRun) {
      console.log(`\n[DRY RUN] Would assign:`);
      console.log(`- ${unassignedProducts.length} products -> ${merchant.email}`);
      console.log(`- ${unassignedPlans.length} recovery plans -> ${merchant.email}`);
      console.log(`- ${unassignedCampaigns.length} campaigns -> ${merchant.email}`);
      console.log(`\nDry run completed. No data was modified.`);
      return;
    }

    // 3. Backup unassigned records to disk before mutating
    const backupDir = path.join(__dirname, '../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFilePath = path.join(backupDir, `legacy-data-backup-${timestamp}.json`);

    const backupPayload = {
      timestamp: new Date().toISOString(),
      targetMerchant: {
        id: merchant._id.toString(),
        email: merchant.email,
      },
      counts: {
        products: unassignedProducts.length,
        recoveryPlans: unassignedPlans.length,
        campaigns: unassignedCampaigns.length,
      },
      data: {
        products: unassignedProducts,
        recoveryPlans: unassignedPlans,
        campaigns: unassignedCampaigns,
      },
    };

    fs.writeFileSync(backupFilePath, JSON.stringify(backupPayload, null, 2), 'utf-8');
    console.log(`\n[Backup Saved] Backup file written to:\n  ${backupFilePath}`);

    // 4. Perform atomic assignment updates
    let updatedProducts = 0;
    let updatedPlans = 0;
    let updatedCampaigns = 0;

    if (unassignedProducts.length > 0) {
      const pRes = await Product.updateMany(
        { $or: [{ merchantId: null }, { merchantId: { $exists: false } }] },
        { $set: { merchantId: merchant._id } }
      );
      updatedProducts = pRes.modifiedCount;
    }

    if (unassignedPlans.length > 0) {
      const planRes = await RecoveryPlan.updateMany(
        { $or: [{ merchantId: null }, { merchantId: { $exists: false } }] },
        { $set: { merchantId: merchant._id } }
      );
      updatedPlans = planRes.modifiedCount;
    }

    if (unassignedCampaigns.length > 0) {
      const campRes = await Campaign.updateMany(
        { $or: [{ merchantId: null }, { merchantId: { $exists: false } }] },
        { $set: { merchantId: merchant._id } }
      );
      updatedCampaigns = campRes.modifiedCount;
    }

    console.log(`\n[Migration Complete]`);
    console.log(`- Successfully assigned ${updatedProducts} products.`);
    console.log(`- Successfully assigned ${updatedPlans} recovery plans.`);
    console.log(`- Successfully assigned ${updatedCampaigns} campaigns.`);
    console.log(`\nAll records now strictly isolated under merchant: ${merchant.email}`);
    console.log(`Rollback instructions: restore records using ${backupFilePath} if required.`);
  } catch (err) {
    console.error('\n[Migration Failed]', err);
    process.exitCode = 1;
  } finally {
    await disconnectDB();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigration();
}
