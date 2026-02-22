# App.jsx Bug Fixes TODO

## BUG 1: Infinite Loop in Page Redirect (CRITICAL - Must Fix)

**Location:** Around line 2613 in the App component (in the main App function)

**Current Problematic Code:**
```javascript
// Redirect to first allowed page if current page is blocked
if (page !== "admin" && !canAccess(page)) {
  setPage(firstPage);
  return null;
}

if (!user) return (<><SyncBanner /><LoginScreen onLogin={setUser} users={users} /></>);
```

**Issues:**
1. `setPage(firstPage)` is called directly in render - causes infinite loop
2. Returns `null` making the app disappear
3. No check for `user` being defined
4. No dependency array for React hooks

**FIX - Replace with:**
```javascript
// Redirect to first allowed page if current page is blocked
useEffect(() => {
  if (user && page !== "admin" && !canAccess(page)) {
    setPage(firstPage);
  }
}, [user, page, userAccess, firstPage]);

if (!user) return (<><SyncBanner /><LoginScreen onLogin={setUser} users={users} /></>);
```

## BUG 2: serverOnline Not Reactive

**Location:** Line ~153

**Current Code:**
```javascript
let serverOnline = false;
```

**Issue:** This global variable doesn't trigger React re-renders

**Note:** This is a design issue but works due to the setInterval workaround in SyncStatus component

## BUG 3: Missing useEffect in DailyCap

**Location:** DailyCap component - syncFromCRG

The useEffect that calls syncFromCRG runs on every crgDeals change, which is correct.

---

## Summary of Required Fixes:

1. Find this section in App.jsx:
```
  // Redirect to first allowed page if current page is blocked
  if (page !== "admin" && !canAccess(page)) {
    setPage(firstPage);
    return null;
  }

  if (!user) return (<><SyncBanner /><LoginScreen onLogin={setUser} users={users} /></>);
```

2. Replace with:
```
  // Redirect to first allowed page if current page is blocked
  useEffect(() => {
    if (user && page !== "admin" && !canAccess(page)) {
      setPage(firstPage);
    }
  }, [user, page, userAccess, firstPage]);

  if (!user) return (<><SyncBanner /><LoginScreen onLogin={setUser} users={users} /></>);
```

