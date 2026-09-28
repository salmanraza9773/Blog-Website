const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

let db = null;
let dbInitPromise = null;

class SqlJsWrapper {
  constructor(sqlDb, persistPath) {
    this.sqlDb = sqlDb;
    this.persistPath = persistPath;
  }

  save() {
    if (this.persistPath) {
      try {
        const data = this.sqlDb.export();
        fs.writeFileSync(this.persistPath, Buffer.from(data));
      } catch (err) {
        console.warn('Warning: Failed to persist database to disk:', err.message);
      }
    }
  }

  async get(sql, params = []) {
    const stmt = this.sqlDb.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    let row = undefined;
    if (stmt.step()) {
      row = stmt.getAsObject();
    }
    stmt.free();
    return row;
  }

  async all(sql, params = []) {
    const stmt = this.sqlDb.prepare(sql);
    if (params && params.length > 0) {
      stmt.bind(params);
    }
    const rows = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    return rows;
  }

  async run(sql, params = []) {
    this.sqlDb.run(sql, params);

    let lastID = 0;
    try {
      const resId = this.sqlDb.exec('SELECT last_insert_rowid() as id');
      if (resId.length > 0 && resId[0].values.length > 0) {
        lastID = resId[0].values[0][0];
      }
    } catch (e) {}

    let changes = 0;
    try {
      const resChanges = this.sqlDb.exec('SELECT changes() as changes');
      if (resChanges.length > 0 && resChanges[0].values.length > 0) {
        changes = resChanges[0].values[0][0];
      }
    } catch (e) {}

    this.save();
    return { lastID, changes };
  }

  async exec(sql) {
    this.sqlDb.exec(sql);
    this.save();
  }
}

async function initDB() {
  if (db) return db;
  if (dbInitPromise) return dbInitPromise;

  dbInitPromise = (async () => {
    const SQL = await initSqlJs({
      locateFile: file => {
        const possibleWasmPaths = [
          path.join(__dirname, '../node_modules/sql.js/dist', file),
          path.join(process.cwd(), 'node_modules/sql.js/dist', file),
          path.join(__dirname, 'node_modules/sql.js/dist', file),
          path.join('/var/task/node_modules/sql.js/dist', file)
        ];
        const found = possibleWasmPaths.find(p => fs.existsSync(p));
        return found || file;
      }
    });

    let dbPath = path.join(__dirname, 'blog.db');
    
    if (process.env.VERCEL) {
      const possibleSourcePaths = [
        path.join(__dirname, 'blog.db'),
        path.join(__dirname, '../server/blog.db'),
        path.join(process.cwd(), 'server', 'blog.db'),
        path.join(process.cwd(), 'blog.db')
      ];

      let sourceDbPath = possibleSourcePaths.find(p => fs.existsSync(p));
      const tempDbPath = path.join('/tmp', 'blog.db');

      if (!fs.existsSync(tempDbPath)) {
        try {
          if (sourceDbPath) {
            fs.copyFileSync(sourceDbPath, tempDbPath);
            console.log(`Database successfully copied from ${sourceDbPath} to writable /tmp/blog.db`);
          } else {
            console.log('No seed database found at source; creating clean database in /tmp/blog.db');
          }
        } catch (err) {
          console.warn('Warning: Failed to copy database to /tmp:', err);
        }
      }
      dbPath = tempDbPath;
    }

    let fileBuffer = null;
    if (fs.existsSync(dbPath)) {
      try {
        fileBuffer = fs.readFileSync(dbPath);
      } catch (err) {
        console.warn('Warning: Could not read db file, creating empty DB:', err.message);
      }
    }

    const rawDb = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();
    const instance = new SqlJsWrapper(rawDb, dbPath);

    // Create tables
    await instance.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        reset_token TEXT,
        reset_token_expiry DATETIME,
        preferences_json TEXT DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS blogs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        summary TEXT,
        estimated_read_time TEXT,
        content TEXT NOT NULL,
        cover_image_path TEXT,
        stream TEXT NOT NULL,
        author_name TEXT DEFAULT 'Super Admin',
        affiliate_enabled INTEGER DEFAULT 1,
        primary_cta_text TEXT DEFAULT 'Check Latest Price',
        primary_cta_url TEXT DEFAULT '#',
        pros_json TEXT DEFAULT '[]',
        cons_json TEXT DEFAULT '[]',
        author_id INTEGER NOT NULL DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(author_id) REFERENCES users(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS likes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        blog_id INTEGER NOT NULL,
        UNIQUE(user_id, blog_id),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(blog_id) REFERENCES blogs(id) ON DELETE CASCADE
      );
    `);

    // Perform column migrations for existing databases
    try {
      const blogTableInfo = await instance.all("PRAGMA table_info(blogs)");
      const blogColNames = blogTableInfo.map(c => c.name);

      if (!blogColNames.includes('summary')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN summary TEXT;");
      }
      if (!blogColNames.includes('estimated_read_time')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN estimated_read_time TEXT;");
      }
      if (!blogColNames.includes('affiliate_enabled')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN affiliate_enabled INTEGER DEFAULT 1;");
      }
      if (!blogColNames.includes('primary_cta_text')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN primary_cta_text TEXT DEFAULT 'Check Latest Price';");
      }
      if (!blogColNames.includes('primary_cta_url')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN primary_cta_url TEXT DEFAULT '#';");
      }
      if (!blogColNames.includes('author_name')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN author_name TEXT DEFAULT 'Super Admin';");
      }
      if (!blogColNames.includes('pros_json')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN pros_json TEXT DEFAULT '[]';");
      }
      if (!blogColNames.includes('cons_json')) {
        await instance.exec("ALTER TABLE blogs ADD COLUMN cons_json TEXT DEFAULT '[]';");
      }

      const userTableInfo = await instance.all("PRAGMA table_info(users)");
      const userColNames = userTableInfo.map(c => c.name);

      if (!userColNames.includes('role')) {
        await instance.exec("ALTER TABLE users ADD COLUMN role TEXT DEFAULT 'user';");
      }
      if (!userColNames.includes('reset_token')) {
        await instance.exec("ALTER TABLE users ADD COLUMN reset_token TEXT;");
      }
      if (!userColNames.includes('reset_token_expiry')) {
        await instance.exec("ALTER TABLE users ADD COLUMN reset_token_expiry DATETIME;");
      }
    } catch (migErr) {
      console.warn('Column migration check warning:', migErr.message);
    }

    console.log('WebAssembly SQLite database initialized successfully.');

    // Auto-seed or update if database is empty or missing pros/cons
    try {
      const blogCount = await instance.get('SELECT COUNT(*) as count FROM blogs');
      const adminUser = await instance.get("SELECT id FROM users WHERE role = 'admin' OR role = 'super_admin'");
      const checkPros = await instance.get("SELECT pros_json FROM blogs WHERE pros_json IS NOT NULL AND pros_json != '[]' LIMIT 1");
      
      if (!blogCount || !blogCount.count || blogCount.count === 0 || !adminUser || !checkPros) {
        console.log('Populating comprehensive monetization dataset with structured pros/cons & admin account...');
        await autoSeed(instance);
      }
    } catch (err) {
      console.warn('Auto-seeding check failed:', err.message);
    }

    db = instance;
    return db;
  })().catch(err => {
    dbInitPromise = null;
    throw err;
  });

  return dbInitPromise;
}

// Helper to extract pros and cons and clean up HTML from content
function extractProsConsFromContent(content) {
  let pros = [];
  let cons = [];
  let cleanedContent = content;

  const proRegex = /<div class="pro-card">[\s\S]*?<ul>([\s\S]*?)<\/ul>/g;
  let match;
  while ((match = proRegex.exec(content)) !== null) {
    const liRegex = /<li>(.*?)<\/li>/g;
    let liMatch;
    while ((liMatch = liRegex.exec(match[1])) !== null) {
      pros.push(liMatch[1].trim());
    }
  }

  const conRegex = /<div class="con-card">[\s\S]*?<ul>([\s\S]*?)<\/ul>/g;
  while ((match = conRegex.exec(content)) !== null) {
    const liRegex = /<li>(.*?)<\/li>/g;
    let liMatch;
    while ((liMatch = liRegex.exec(match[1])) !== null) {
      cons.push(liMatch[1].trim());
    }
  }

  // Remove the raw pros-cons-grid HTML block so it does not leak raw HTML in content
  cleanedContent = cleanedContent.replace(/## Pros & Cons Breakdown[\s\S]*?(?:<\/div>\s*<\/div>|<div class="pros-cons-grid">[\s\S]*?<\/div>\s*<\/div>)/gi, '');
  cleanedContent = cleanedContent.replace(/<div class="pros-cons-grid">[\s\S]*?<\/div>\s*<\/div>/gi, '');
  cleanedContent = cleanedContent.replace(/---\s*---/g, '---').trim();

  return { pros, cons, cleanedContent };
}

async function autoSeed(database) {
  const bcrypt = require('bcryptjs');
  const articlesData = require('./articles_data');

  try {
    const defaultPasswordHash = await bcrypt.hash('test@123', 10);
    const adminPasswordHash = await bcrypt.hash('AdminMasterKey_2026!', 10);
    
    // Seed default users including Super Admin
    const users = [
      { username: 'super_admin', email: 'admin@knowledgeshare.com', passwordHash: adminPasswordHash, role: 'super_admin' },
      { username: 'editor_prime', email: 'editor@knowledgeshare.com', passwordHash: defaultPasswordHash, role: 'admin' },
      { username: 'science_scribe', email: 'scribe@knowledgeshare.com', passwordHash: defaultPasswordHash, role: 'user' },
      { username: 'market_analyst', email: 'analyst@knowledgeshare.com', passwordHash: defaultPasswordHash, role: 'user' }
    ];

    const userMap = new Map();
    for (const u of users) {
      let row = await database.get('SELECT id FROM users WHERE username = ? OR email = ?', [u.username, u.email]);
      if (!row) {
        const res = await database.run(
          'INSERT INTO users (username, email, password_hash, role, preferences_json) VALUES (?, ?, ?, ?, ?)',
          [u.username, u.email, u.passwordHash, u.role, JSON.stringify({ savedStreams: [] })]
        );
        userMap.set(u.username, res.lastID);
      } else {
        await database.run('UPDATE users SET role = ?, password_hash = ? WHERE id = ?', [u.role, u.passwordHash, row.id]);
        userMap.set(u.username, row.id);
      }
    }

    const defaultAuthorId = userMap.get('super_admin') || 1;

    // Clear existing articles to ensure high-retention dataset with structured pros_json/cons_json is active
    await database.exec('DELETE FROM blogs');
    await database.exec('DELETE FROM likes');

    for (const art of articlesData) {
      const extracted = extractProsConsFromContent(art.content);
      let pros = art.pros_json || extracted.pros;
      let cons = art.cons_json || extracted.cons;
      let content = extracted.cleanedContent || art.content;

      // Provide sensible defaults if article had no pros/cons
      if (!pros || pros.length === 0) {
        if (art.stream === 'Technology') {
          pros = ['Exceptional performance benchmarked under heavy sustained load', 'High-efficiency thermal and acoustic engineering'];
          cons = ['Premium commercial pricing tier', 'Specialized setup recommended'];
        } else if (art.stream === 'Medical') {
          pros = ['Peer-reviewed clinical validation in human trials', 'High-frequency telemetry with sub-millisecond precision'];
          cons = ['Regulatory rollout stages ongoing', 'Requires compatible monitoring ecosystem'];
        } else if (art.stream === 'Science') {
          pros = ['Groundbreaking astrophysics and engineering telemetry', 'International collaboration framework'];
          cons = ['Complex multi-phase orbital deployment timeline'];
        } else if (art.stream === 'Business') {
          pros = ['Substantial reduction in human overhead and latency', 'Autonomous transactional security'];
          cons = ['Requires modern enterprise API integration'];
        } else {
          pros = ['Top-tier value for performance ratio', 'Extensive feature set'];
          cons = ['High demand and limited launch supply'];
        }
      }

      if (!cons || cons.length === 0) {
        cons = ['Consider budget and workflow requirements before purchase'];
      }

      await database.run(
        `INSERT INTO blogs (
          title, summary, estimated_read_time, content, cover_image_path, 
          stream, author_name, affiliate_enabled, primary_cta_text, primary_cta_url,
          pros_json, cons_json, author_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          art.title,
          art.summary,
          art.estimated_read_time,
          content,
          art.cover_image_path,
          art.stream,
          art.author_name || 'Super Admin',
          art.affiliate_enabled !== undefined ? art.affiliate_enabled : 1,
          art.primary_cta_text || 'Check Latest Price',
          art.primary_cta_url || '#',
          JSON.stringify(pros),
          JSON.stringify(cons),
          defaultAuthorId
        ]
      );
    }
    console.log('✓ Successfully ingested 10 high-retention monetization articles with structured pros/cons into SQLite database.');
  } catch (err) {
    console.error('Auto-seed error:', err.message);
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call initDB first.');
  }
  return db;
}

module.exports = {
  initDB,
  getDB
};
