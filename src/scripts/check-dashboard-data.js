/**
 * Diagnostic script to check what data exists for dashboards
 * Run with: node src/scripts/check-dashboard-data.js [org_id]
 */

import { db } from "../db/mysql.js";

const orgId = process.argv[2] || "org_local";

async function checkData() {
  console.log(`\n=== Dashboard Data Check for org_id: ${orgId} ===\n`);

  try {
    // 1. Check revenue_events
    const [revenueEvents] = await db.query(
      `SELECT COUNT(*) as count, 
              MIN(occurred_at) as earliest, 
              MAX(occurred_at) as latest,
              SUM(amount) as total_revenue
       FROM revenue_events 
       WHERE org_id = ?`,
      [orgId]
    );
    console.log("1. Revenue Events:");
    console.log(`   Count: ${revenueEvents[0].count}`);
    console.log(`   Total Revenue: $${Number(revenueEvents[0].total_revenue || 0).toLocaleString()}`);
    console.log(`   Date Range: ${revenueEvents[0].earliest || 'N/A'} to ${revenueEvents[0].latest || 'N/A'}`);

    // 2. Check attribution_runs
    const [attributionRuns] = await db.query(
      `SELECT COUNT(*) as count,
              SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
              SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
              SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running
       FROM attribution_runs 
       WHERE org_id = ?`,
      [orgId]
    );
    console.log("\n2. Attribution Runs:");
    console.log(`   Total: ${attributionRuns[0].count}`);
    console.log(`   Completed: ${attributionRuns[0].completed}`);
    console.log(`   Failed: ${attributionRuns[0].failed}`);
    console.log(`   Running: ${attributionRuns[0].running}`);

    // 3. Check attribution_results
    const [attributionResults] = await db.query(
      `SELECT COUNT(*) as count,
              COUNT(DISTINCT revenue_event_id) as unique_revenue_events,
              COUNT(DISTINCT model) as models_count
       FROM attribution_results 
       WHERE org_id = ?`,
      [orgId]
    );
    console.log("\n3. Attribution Results:");
    console.log(`   Total: ${attributionResults[0].count}`);
    console.log(`   Unique Revenue Events: ${attributionResults[0].unique_revenue_events}`);
    console.log(`   Models: ${attributionResults[0].models_count}`);

    // 4. Check attribution_contributions
    const [attributionContributions] = await db.query(
      `SELECT COUNT(*) as count,
              COUNT(DISTINCT campaign_id) as unique_campaigns,
              SUM(weight) as total_weight
       FROM attribution_contributions 
       WHERE org_id = ?`,
      [orgId]
    );
    console.log("\n4. Attribution Contributions:");
    console.log(`   Total: ${attributionContributions[0].count}`);
    console.log(`   Unique Campaigns: ${attributionContributions[0].unique_campaigns}`);
    console.log(`   Total Weight: ${Number(attributionContributions[0].total_weight || 0).toFixed(2)}`);

    // 5. Check campaign_costs (spend data)
    const [campaignCosts] = await db.query(
      `SELECT COUNT(*) as count,
              COUNT(DISTINCT campaign_id) as unique_campaigns,
              SUM(amount) as total_spend,
              MIN(cost_date) as earliest_date,
              MAX(cost_date) as latest_date
       FROM campaign_costs 
       WHERE org_id = ?`,
      [orgId]
    );
    console.log("\n5. Campaign Costs (Spend Data):");
    console.log(`   Total Records: ${campaignCosts[0].count}`);
    console.log(`   Unique Campaigns: ${campaignCosts[0].unique_campaigns}`);
    console.log(`   Total Spend: $${Number(campaignCosts[0].total_spend || 0).toLocaleString()}`);
    console.log(`   Date Range: ${campaignCosts[0].earliest_date || 'N/A'} to ${campaignCosts[0].latest_date || 'N/A'}`);

    // 6. Check campaigns
    const [campaigns] = await db.query(
      `SELECT COUNT(*) as count,
              SUM(CASE WHEN status = 'live' THEN 1 ELSE 0 END) as live,
              SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved
       FROM campaigns 
       WHERE org_id = ?`,
      [orgId]
    );
    console.log("\n6. Campaigns:");
    console.log(`   Total: ${campaigns[0].count}`);
    console.log(`   Live: ${campaigns[0].live}`);
    console.log(`   Approved: ${campaigns[0].approved}`);

    // 7. Check for revenue events without attribution
    const [revenueWithoutAttribution] = await db.query(
      `SELECT COUNT(DISTINCT re.id) as count
       FROM revenue_events re
       LEFT JOIN attribution_results ar ON ar.org_id = re.org_id AND ar.revenue_event_id = re.id
       WHERE re.org_id = ? AND ar.id IS NULL`,
      [orgId]
    );
    console.log("\n7. Revenue Events WITHOUT Attribution:");
    console.log(`   Count: ${revenueWithoutAttribution[0].count}`);
    if (revenueWithoutAttribution[0].count > 0) {
      console.log(`   ⚠️  WARNING: ${revenueWithoutAttribution[0].count} revenue events need attribution runs!`);
    }

    // 8. Sample query to see what executive dashboard would return
    console.log("\n8. Executive Dashboard Query Test (last 30 days, last_touch model):");
    const [execTest] = await db.query(
      `SELECT 
        (SELECT COALESCE(SUM(amount), 0) 
         FROM campaign_costs 
         WHERE org_id = ? 
           AND COALESCE(occurred_at, cost_date) >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as spend_sum,
        (SELECT COALESCE(SUM(re.amount * ac.weight), 0)
         FROM revenue_events re
         JOIN attribution_results ar ON ar.org_id = re.org_id AND ar.revenue_event_id = re.id
         JOIN attribution_contributions ac ON ac.org_id = re.org_id AND ac.attribution_result_id = ar.id
         WHERE re.org_id = ?
           AND ar.model = 'last_touch'
           AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)) as attributed_revenue_sum`,
      [orgId, orgId]
    );
    console.log(`   Spend: $${Number(execTest[0].spend_sum || 0).toLocaleString()}`);
    console.log(`   Attributed Revenue: $${Number(execTest[0].attributed_revenue_sum || 0).toLocaleString()}`);

    // 9. Sample ROI query
    console.log("\n9. ROI Dashboard Query Test (last 30 days, last_touch model):");
    const [roiTest] = await db.query(
      `SELECT 
        COUNT(DISTINCT ac.campaign_id) as campaigns_with_data
       FROM revenue_events re
       JOIN attribution_results ar ON ar.org_id = re.org_id AND ar.revenue_event_id = re.id
       JOIN attribution_contributions ac ON ac.org_id = re.org_id AND ac.attribution_result_id = ar.id
       WHERE re.org_id = ?
         AND ar.model = 'last_touch'
         AND re.occurred_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
      [orgId]
    );
    console.log(`   Campaigns with ROI data: ${roiTest[0].campaigns_with_data}`);

    console.log("\n=== Summary ===");
    const hasRevenue = revenueEvents[0].count > 0;
    const hasAttribution = attributionResults[0].count > 0;
    const hasSpend = campaignCosts[0].count > 0;
    const hasCampaigns = campaigns[0].count > 0;

    console.log(`✓ Revenue Events: ${hasRevenue ? 'YES' : 'NO'}`);
    console.log(`✓ Attribution Results: ${hasAttribution ? 'YES' : 'NO'}`);
    console.log(`✓ Campaign Costs: ${hasSpend ? 'YES' : 'NO'}`);
    console.log(`✓ Campaigns: ${hasCampaigns ? 'YES' : 'NO'}`);

    if (!hasRevenue) {
      console.log("\n❌ Missing: Revenue events. You need to create revenue_events first.");
    }
    if (!hasAttribution) {
      console.log("\n❌ Missing: Attribution results. Run attribution for your revenue events using /attribution/runs API");
    }
    if (!hasSpend) {
      console.log("\n❌ Missing: Campaign costs (spend data). You need to ingest cost data into campaign_costs table.");
    }
    if (!hasCampaigns) {
      console.log("\n⚠️  Warning: No campaigns found. Dashboards will work but won't show campaign names.");
    }

    if (hasRevenue && !hasAttribution) {
      console.log("\n💡 Action: Run attribution for your revenue events:");
      console.log("   POST /v1/attribution/runs");
      console.log("   Body: { \"revenue_event_id\": \"<id>\", \"model\": \"last_touch\", \"window_days\": 90 }");
    }

  } catch (error) {
    console.error("Error checking data:", error);
    process.exit(1);
  }
}

checkData();
