# CRG Deals & Daily Cap Integration - Task List

## Progress Tracking

### Backend Updates
- [x] Add data sync function for external APIs
- [x] Add scheduled sync (every 15 minutes)
- [x] Add /todaycap bot command
- [x] Add manual sync endpoint

### Data Files
- [x] Update daily-cap.json with provided data
- [x] Update crg-deals.json with latest data


### Testing
- [x] Test /todaycap bot command
- [x] Verify data sync functionality
- [x] Test API endpoints


## Implementation Details

### New Bot Command: /todaycap
- Shows today's agent cap data
- Formatted table with: Agent, Affiliates, Brands
- Filters by today's date
- Includes summary statistics

### Data Sync
- Fetches from https://leeds-crm.com/api/crg-deals
- Fetches from https://leeds-crm.com/api/daily-cap
- Saves to local JSON files
- Runs every 15 minutes automatically
- Manual sync via POST /api/sync
