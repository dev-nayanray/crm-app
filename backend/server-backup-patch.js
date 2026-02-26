// ============================================================
// BACKUP RESTORE PATCH — Add these endpoints to your server.js
// Add AFTER your existing /admin/backup POST endpoint
// ============================================================

// GET /admin/backups — List last 3 backups
app.get('/api/admin/backups', requireAuth, (req, res) => {
  try {
    const backupDir = path.join(__dirname, 'backups');
    if (!fs.existsSync(backupDir)) return res.json({ backups: [] });
    
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup-') && f.endsWith('.json'))
      .map(f => {
        const stat = fs.statSync(path.join(backupDir, f));
        return {
          name: f,
          date: stat.mtime.toISOString(),
          size: stat.size > 1024*1024 
            ? (stat.size / (1024*1024)).toFixed(1) + ' MB' 
            : (stat.size / 1024).toFixed(0) + ' KB'
        };
      })
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 3);
    
    res.json({ backups: files });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /admin/restore — Restore from a specific backup
app.post('/api/admin/restore', requireAuth, (req, res) => {
  try {
    const { backup } = req.body;
    if (!backup) return res.status(400).json({ error: 'No backup specified' });
    
    // Sanitize filename to prevent path traversal
    const safeName = path.basename(backup);
    const backupPath = path.join(__dirname, 'backups', safeName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup file not found' });
    }
    
    // Create safety backup of current data before restoring
    const safetyName = `backup-pre-restore-${Date.now()}.json`;
    const safetyPath = path.join(__dirname, 'backups', safetyName);
    const currentData = {};
    const dataDir = path.join(__dirname, 'data');
    const tables = ['users', 'payments', 'customer-payments', 'crg-deals', 'daily-cap', 'deals', 'wallets'];
    
    for (const table of tables) {
      const filePath = path.join(dataDir, `${table}.json`);
      if (fs.existsSync(filePath)) {
        try { currentData[table] = JSON.parse(fs.readFileSync(filePath, 'utf8')); }
        catch { currentData[table] = []; }
      }
    }
    fs.writeFileSync(safetyPath, JSON.stringify(currentData, null, 2));
    
    // Read and restore from backup
    const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    for (const table of tables) {
      if (backupData[table] && Array.isArray(backupData[table])) {
        const filePath = path.join(dataDir, `${table}.json`);
        fs.writeFileSync(filePath, JSON.stringify(backupData[table], null, 2));
      }
    }
    
    // Log the restore
    console.log(`🔄 DATABASE RESTORED from ${safeName} by ${req.user || 'admin'}`);
    console.log(`   Safety backup saved as: ${safetyName}`);
    
    res.json({ 
      ok: true, 
      restored: safeName, 
      safetyBackup: safetyName,
      tables: tables.filter(t => backupData[t] && Array.isArray(backupData[t]))
        .map(t => `${t}: ${backupData[t].length} records`)
    });
  } catch (e) {
    console.error('Restore failed:', e);
    res.status(500).json({ error: e.message });
  }
});
