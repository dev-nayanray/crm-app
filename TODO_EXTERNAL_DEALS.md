# TODO - Fetch Deals from External API

## Task: Integrate https://leeds-crm.com/api/deals with /deals command

### Steps:
- [x] 1. Add helper function to fetch deals from external API (https://leeds-crm.com/api/deals)
- [x] 2. Modify /deals command handler to use external API
- [x] 3. Display external API data format (affiliate, country, price, crg, funnels, source, deduction)
- [x] 4. Add fallback to local data if API fails
- [ ] 5. Test the implementation

### External API Data Format:
```json
[{"affiliate":"12","country":"DE","price":"1400","crg":"5","funnels":"Ai","source":"Msn","deduction":"5","id":"u9a81bmr5"}, ...]
```

### Expected Fields:
- affiliate
- country
- price
- crg
- funnels
- source
- deduction
- id

