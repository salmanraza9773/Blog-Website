const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

let db = null;

async function initDB() {
  if (db) return db;
  
  let dbPath = path.join(__dirname, 'blog.db');
  
  if (process.env.VERCEL) {
    const tempDbPath = path.join('/tmp', 'blog.db');
    if (!fs.existsSync(tempDbPath)) {
      try {
        if (fs.existsSync(dbPath)) {
          fs.copyFileSync(dbPath, tempDbPath);
          console.log('Database successfully copied to writable /tmp/blog.db');
        } else {
          console.log('No seed database found at source; creating clean database in /tmp/blog.db');
        }
      } catch (err) {
        console.warn('Warning: Failed to copy database to /tmp:', err);
      }
    }
    dbPath = tempDbPath;
  }
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  // Enable foreign keys
  await db.get('PRAGMA foreign_keys = ON');

  // Create tables
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      preferences_json TEXT DEFAULT '{}'
    );

    CREATE TABLE IF NOT EXISTS blogs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      cover_image_path TEXT,
      stream TEXT NOT NULL,
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

  console.log('Database connection opened and schema validated.');
  return db;
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
