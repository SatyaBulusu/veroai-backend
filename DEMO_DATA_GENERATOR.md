# Demo Data Generator

## Overview

The demo data generator creates comprehensive test data for all dashboard golden path tables with **current dates** for data freshness.

## What It Creates

1. **6 Campaigns** - Various marketing campaigns with different statuses
2. **8 Profiles** - User profiles with email identifiers
3. **~180 Events** - Marketing touchpoints spread over last 60 days
4. **~60 Revenue Events** - Revenue transactions spread over last 30 days
5. **Attribution Results** - Runs attribution for all revenue events (last_touch model)
6. **~90 Campaign Costs** - Spend data spread over last 30 days

All dates are **current/recent** so data appears in dashboards with default 30-day window.

## Usage

### Via API (Recommended)

```bash
POST http://localhost:3000/v1/demo/generate
Headers:
  X-Org-Id: org_local
  X-API-Key: <your-api-key> (optional if AUTH_DISABLED=true)
```

**Response:**
```json
{
  "success": true,
  "org_id": "org_local",
  "summary": {
    "campaigns_created": 6,
    "profiles_created": 8,
    "events_created": 180,
    "revenue_events_created": 60,
    "attribution_runs_completed": 60,
    "attribution_runs_failed": 0,
    "campaign_costs_created": 90
  },
  "details": {
    "campaigns": [...],
    "profiles": [...],
    ...
  }
}
```

### Via cURL

```bash
curl -X POST http://localhost:3000/v1/demo/generate \
  -H "Content-Type: application/json" \
  -H "X-Org-Id: org_local"
```

### Via Postman

1. Method: `POST`
2. URL: `http://localhost:3000/v1/demo/generate`
3. Headers:
   - `X-Org-Id: org_local`
   - `Content-Type: application/json`

## Data Characteristics

- **Campaigns**: Mix of "live" and "approved" statuses
- **Events**: Randomly distributed across campaigns and profiles over 60 days
- **Revenue Events**: $500-$3000 amounts, spread over last 30 days
- **Campaign Costs**: $50-$550 per day, spread over last 30 days
- **Attribution**: Uses "last_touch" model with 90-day window

## After Generation

Once data is generated:
1. Refresh your dashboards
2. Data should appear immediately (all dates are current)
3. Executive Dashboard will show attributed revenue
4. ROI Dashboard will show ROI calculations
5. Finance Dashboard will show spend vs revenue

## Notes

- Attribution runs are done in batches of 5 to avoid overwhelming the system
- All data uses `org_local` by default (or the org_id from headers)
- Data is generated with realistic relationships (events link to campaigns, revenue links to profiles)
- Dates are randomized within the time windows for more realistic distribution
