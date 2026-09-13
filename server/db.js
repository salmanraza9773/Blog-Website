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
        affiliate_enabled INTEGER DEFAULT 1,
        primary_cta_text TEXT DEFAULT 'Check Latest Price',
        primary_cta_url TEXT DEFAULT '#',
        author_id INTEGER NOT NULL,
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

    // Auto-seed or re-seed if database is empty or has old articles
    try {
      const blogCount = await instance.get('SELECT COUNT(*) as count FROM blogs');
      const adminUser = await instance.get("SELECT id FROM users WHERE role = 'admin'");
      
      if (!blogCount || !blogCount.count || blogCount.count === 0 || !adminUser) {
        console.log('Populating comprehensive 10-article monetization dataset & admin account...');
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

async function autoSeed(database) {
  const bcrypt = require('bcryptjs');
  const articlesData = require('./articles_data');

  try {
    const defaultPasswordHash = await bcrypt.hash('test@123', 10);
    const adminPasswordHash = await bcrypt.hash('AdminPassword2026!', 10);
    
    // Seed default users including Super Admin
    const users = [
      { username: 'super_admin', email: 'admin@blog.local', passwordHash: adminPasswordHash, role: 'admin' },
      { username: 'editor_prime', email: 'editor@knowledgeshare.com', passwordHash: defaultPasswordHash, role: 'user' },
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
        // Update existing user role if needed
        await database.run('UPDATE users SET role = ? WHERE id = ?', [u.role, row.id]);
        userMap.set(u.username, row.id);
      }
    }

    const defaultAuthorId = userMap.get('editor_prime') || 1;

    // Clear existing old articles to ensure high-retention 10-article dataset is active
    await database.exec('DELETE FROM blogs');
    await database.exec('DELETE FROM likes');

    for (const art of articlesData) {
      await database.run(
        `INSERT INTO blogs (
          title, summary, estimated_read_time, content, cover_image_path, 
          stream, affiliate_enabled, primary_cta_text, primary_cta_url, author_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          art.title,
          art.summary,
          art.estimated_read_time,
          art.content,
          art.cover_image_path,
          art.stream,
          art.affiliate_enabled !== undefined ? art.affiliate_enabled : 1,
          art.primary_cta_text || 'Check Latest Price',
          art.primary_cta_url || '#',
          defaultAuthorId
        ]
      );
    }
    console.log('✓ Successfully ingested 10 high-retention monetization articles into SQLite database.');
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
