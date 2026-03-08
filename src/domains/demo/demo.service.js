import { newId } from "../../utils/id.js";
import { pool } from "../../config/db.js";
import { attributionService } from "../attribution/attribution.service.js";

/**
 * Generate comprehensive demo data for dashboards
 * Creates: campaigns, profiles, events, revenue events, attribution, campaign costs
 * All dates are current/recent for data freshness
 */
export const demoService = {
  async generateDemoData(orgId = "org_local", requestId = "demo") {
    const results = {
      campaigns: [],
      profiles: [],
      events: [],
      revenue_events: [],
      attribution_runs: [],
      campaign_costs: []
    };

    const now = new Date();
    
    // 1. Create campaigns
    const campaignNames = [
      "Summer Sale 2024",
      "Product Launch Campaign",
      "Email Newsletter",
      "Social Media Ads",
      "Retargeting Campaign",
      "Holiday Promotion"
    ];
    
    const channels = ["google", "facebook", "email", "linkedin", "twitter"];
    const statuses = ["live", "approved", "live", "live", "approved", "live"];
    
    for (let i = 0; i < campaignNames.length; i++) {
      const campaignId = newId("cam");
      await pool.query(
        `INSERT INTO campaigns (id, org_id, name, status, objective, target_value, currency, created_by, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [
          campaignId,
          orgId,
          campaignNames[i],
          statuses[i],
          i % 2 === 0 ? "revenue" : "pipeline",
          (i + 1) * 10000,
          "USD",
          "demo_generator"
        ]
      );
      results.campaigns.push({ id: campaignId, name: campaignNames[i] });
    }

    // 2. Create profiles
    const profileEmails = [
      "alice@example.com",
      "bob@example.com",
      "charlie@example.com",
      "diana@example.com",
      "eve@example.com",
      "frank@example.com",
      "grace@example.com",
      "henry@example.com"
    ];

    for (const email of profileEmails) {
      const profileId = newId("pro");
      // Insert profile with org_id
      await pool.query(
        `INSERT INTO profiles (id, org_id, type, lifecycle_stage, created_at, updated_at)
         VALUES (?, ?, 'person', NULL, NOW(), NOW())`,
        [profileId, orgId]
      );
      
      await pool.query(
        `INSERT INTO profile_identifiers (org_id, profile_id, id_type, id_value, created_at)
         VALUES (?, ?, 'email', ?, NOW())
         ON DUPLICATE KEY UPDATE id_value = VALUES(id_value)`,
        [orgId, profileId, email]
      );
      
      results.profiles.push({ id: profileId, email });
    }

    // 3. Create events (marketing touchpoints) - spread over last 60 days
    const eventNames = ["page_view", "click", "form_submit", "download", "video_view"];
    let eventCount = 0;
    
    for (let dayOffset = 0; dayOffset < 60; dayOffset++) {
      const eventDate = new Date(now);
      eventDate.setDate(eventDate.getDate() - dayOffset);
      
      // Create 2-5 events per day
      const eventsPerDay = Math.floor(Math.random() * 4) + 2;
      
      for (let j = 0; j < eventsPerDay; j++) {
        const profileIdx = Math.floor(Math.random() * profileEmails.length);
        const campaignIdx = Math.floor(Math.random() * results.campaigns.length);
        const eventName = eventNames[Math.floor(Math.random() * eventNames.length)];
        
        const eventId = newId("evt");
        const eventTime = new Date(eventDate);
        eventTime.setHours(Math.floor(Math.random() * 24));
        eventTime.setMinutes(Math.floor(Math.random() * 60));
        
        await pool.query(
          `INSERT INTO events (id, org_id, profile_id, name, occurred_at, properties_json, campaign_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            eventId,
            orgId,
            results.profiles[profileIdx].id,
            eventName,
            eventTime,
            JSON.stringify({ source: "web", page: "/products" }),
            results.campaigns[campaignIdx].id
          ]
        );
        eventCount++;
      }
    }
    results.events.push({ count: eventCount });

    // 4. Create revenue events - spread over last 30 days
    const revenueAmounts = [500, 750, 1000, 1250, 1500, 2000, 2500, 3000];
    const revenueEventIds = [];
    
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const revenueDate = new Date(now);
      revenueDate.setDate(revenueDate.getDate() - dayOffset);
      
      // Create 1-3 revenue events per day
      const revenuePerDay = Math.floor(Math.random() * 3) + 1;
      
      for (let j = 0; j < revenuePerDay; j++) {
        const profileIdx = Math.floor(Math.random() * profileEmails.length);
        const amount = revenueAmounts[Math.floor(Math.random() * revenueAmounts.length)];
        
        const revenueEventId = newId("rev");
        const revenueTime = new Date(revenueDate);
        revenueTime.setHours(Math.floor(Math.random() * 24));
        revenueTime.setMinutes(Math.floor(Math.random() * 60));
        
        await pool.query(
          `INSERT INTO revenue_events (id, org_id, external_id, source, profile_id, amount, currency, occurred_at, properties_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
          [
            revenueEventId,
            orgId,
            `ext_${revenueEventId}`,
            "crm",
            results.profiles[profileIdx].id,
            amount,
            "USD",
            revenueTime,
            JSON.stringify({ product: "premium_plan", subscription: true })
          ]
        );
        
        revenueEventIds.push(revenueEventId);
        results.revenue_events.push({ id: revenueEventId, amount, occurred_at: revenueTime });
      }
    }

    // 5. Run attribution for all revenue events (in batches to avoid overwhelming)
    console.log(`Running attribution for ${revenueEventIds.length} revenue events...`);
    const batchSize = 5;
    for (let i = 0; i < revenueEventIds.length; i += batchSize) {
      const batch = revenueEventIds.slice(i, i + batchSize);
      await Promise.allSettled(
        batch.map(async (revenueEventId) => {
          try {
            await attributionService.runAttribution(
              {
                revenue_event_id: revenueEventId,
                model: "last_touch",
                window_days: 90
              },
              requestId,
              orgId
            );
            results.attribution_runs.push({ revenue_event_id: revenueEventId, status: "completed" });
          } catch (err) {
            console.error(`Attribution failed for ${revenueEventId}:`, err.message);
            results.attribution_runs.push({ revenue_event_id: revenueEventId, status: "failed", error: err.message });
          }
        })
      );
    }

    // 6. Create campaign costs (spend data) - spread over last 30 days
    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const costDate = new Date(now);
      costDate.setDate(costDate.getDate() - dayOffset);
      
      // Create costs for 2-4 campaigns per day
      const campaignsPerDay = Math.floor(Math.random() * 3) + 2;
      const campaignIndices = new Set();
      while (campaignIndices.size < campaignsPerDay) {
        campaignIndices.add(Math.floor(Math.random() * results.campaigns.length));
      }
      
      for (const campaignIdx of campaignIndices) {
        const amount = Math.floor(Math.random() * 500) + 50; // $50-$550 per day
        const channel = channels[Math.floor(Math.random() * channels.length)];
        
        const costId = newId("cost");
        await pool.query(
          `INSERT INTO campaign_costs (id, org_id, campaign_id, channel, cost_date, amount, currency, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            costId,
            orgId,
            results.campaigns[campaignIdx].id,
            channel,
            costDate.toISOString().split('T')[0],
            amount,
            "USD"
          ]
        );
        results.campaign_costs.push({ campaign_id: results.campaigns[campaignIdx].id, amount, date: costDate });
      }
    }

    return {
      success: true,
      org_id: orgId,
      summary: {
        campaigns_created: results.campaigns.length,
        profiles_created: results.profiles.length,
        events_created: results.events[0].count,
        revenue_events_created: results.revenue_events.length,
        attribution_runs_completed: results.attribution_runs.filter(r => r.status === "completed").length,
        attribution_runs_failed: results.attribution_runs.filter(r => r.status === "failed").length,
        campaign_costs_created: results.campaign_costs.length
      },
      details: results
    };
  }
};
