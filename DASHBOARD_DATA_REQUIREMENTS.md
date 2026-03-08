# Dashboard Data Requirements

## Executive Dashboard & ROI Dashboard Data Dependencies

Both dashboards require data from the following tables:

### Required Tables:

1. **`revenue_events`** - Revenue transactions
   - Required fields: `id`, `org_id`, `profile_id`, `amount`, `occurred_at`
   - Used for: Calculating attributed revenue

2. **`attribution_results`** - Results of attribution runs
   - Required fields: `id`, `org_id`, `revenue_event_id`, `model`
   - Used for: Linking revenue to campaigns
   - **CRITICAL**: Must run attribution first using `/attribution/runs` API

3. **`attribution_contributions`** - Campaign contributions to revenue
   - Required fields: `org_id`, `attribution_result_id`, `campaign_id`, `weight`
   - Used for: Calculating attributed revenue per campaign
   - **CRITICAL**: Created automatically when attribution runs complete

4. **`campaign_costs`** - Marketing spend data
   - Required fields: `org_id`, `campaign_id`, `amount`, `cost_date`
   - Used for: Calculating ROI (revenue / spend)
   - **CRITICAL**: Must ingest cost data using `/campaign-costs` API

5. **`campaigns`** (optional but recommended)
   - Required fields: `id`, `org_id`, `name`, `status`
   - Used for: Displaying campaign names in dashboards

### Data Flow:

```
1. Create revenue_events
   ↓
2. Run attribution: POST /v1/attribution/runs
   → Creates attribution_results
   → Creates attribution_contributions
   ↓
3. Ingest campaign costs: POST /v1/campaign-costs
   → Creates campaign_costs records
   ↓
4. Dashboards can now show data
```

### Common Issues:

1. **No Attribution Results**
   - Symptom: Dashboards show $0 revenue even though revenue_events exist
   - Fix: Run attribution for your revenue events
   - API: `POST /v1/attribution/runs`
   - Body: `{ "revenue_event_id": "...", "model": "last_touch", "window_days": 90 }`

2. **No Campaign Costs**
   - Symptom: Dashboards show revenue but no spend/ROI data
   - Fix: Ingest cost data
   - API: `POST /v1/campaign-costs`
   - Body: `{ "items": [{ "campaign_id": "...", "channel": "...", "cost_date": "...", "amount": 100 }] }`

3. **Wrong org_id**
   - Symptom: Data exists but dashboards show empty
   - Fix: Ensure all data has the same `org_id` as your API requests
   - Check: Use diagnostic script to verify org_id matches

### Diagnostic Script:

Run the diagnostic script to check what data you have:

```bash
cd veroai-backend
node src/scripts/check-dashboard-data.js [org_id]
```

This will show:
- Count of records in each required table
- Whether attribution has been run
- Sample queries matching what dashboards use
- Specific recommendations for missing data
