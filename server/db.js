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

  // Auto-seed if database is brand new / empty
  try {
    const blogCount = await db.get('SELECT COUNT(*) as count FROM blogs');
    if (!blogCount || blogCount.count === 0) {
      console.log('Database is empty. Populating default seed data...');
      await autoSeed(db);
    }
  } catch (err) {
    console.warn('Auto-seeding check failed:', err.message);
  }

  return db;
}

async function autoSeed(database) {
  const bcrypt = require('bcryptjs');
  try {
    const defaultPasswordHash = await bcrypt.hash('test@123', 10);
    
    // Seed default users
    const users = [
      { username: 'editor_prime', email: 'editor@knowledgeshare.com' },
      { username: 'science_scribe', email: 'scribe@knowledgeshare.com' },
      { username: 'market_analyst', email: 'analyst@knowledgeshare.com' }
    ];

    const userMap = new Map();
    for (const u of users) {
      let row = await database.get('SELECT id FROM users WHERE username = ?', [u.username]);
      if (!row) {
        const res = await database.run(
          'INSERT INTO users (username, email, password_hash, preferences_json) VALUES (?, ?, ?, ?)',
          [u.username, u.email, defaultPasswordHash, JSON.stringify({ savedStreams: [] })]
        );
        userMap.set(u.username, res.lastID);
      } else {
        userMap.set(u.username, row.id);
      }
    }

    const defaultAuthorId = userMap.get('editor_prime') || 1;

    // Seed default articles
    const defaultArticles = [
      {
        title: 'The Era of Native Multimodal AI: Architecting Systems with Reasoning at Scale',
        stream: 'Technology',
        cover_image_path: 'https://images.unsplash.com/photo-1677442136019-21780efad99a?q=80&w=600&auto=format&fit=crop',
        content: `> "The transition from text-only reasoning to native multimodal systems represents the most significant architectural paradigm shift in artificial intelligence since the transformer itself."\n\n## Architecting Reasoning at Scale\n\nIn 2026, enterprise deployment of artificial intelligence has moved past simple chatbot interfaces into autonomous cognitive architectures. Native multimodal models—which process video, audio, code, and sensory data streams concurrently without separate transcription pipelines—are now operating at scale. These systems are defined by their ability to perform deep multi-step reasoning before generating outputs, representing a shift from raw statistical generation to systematic logical inference.`
      },
      {
        title: 'Quantum Error Correction: The Enterprise Shift Toward Post-Quantum Cryptography Standards',
        stream: 'Technology',
        cover_image_path: 'https://images.unsplash.com/photo-1661956602116-aa6865609028?q=80&w=600&auto=format&fit=crop',
        content: `> "Quantum computer development has reached a critical velocity. As labs build fault-tolerant qubits, the mathematical assumptions backing global finance must adapt today."\n\n## The Cryptographic Countdown\n\nFor years, quantum computing existed primarily in academic labs. However, recent breakthroughs in Quantum Error Correction (QEC) have dramatically reduced the physical-to-logical qubit ratio required to execute complex operations.`
      },
      {
        title: 'Breakthroughs in CRISPR-Cas13 Target Selection for Respiratory RNA Viruses',
        stream: 'Medical',
        cover_image_path: 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?q=80&w=600&auto=format&fit=crop',
        content: `> "Targeting messenger RNA directly allows precision intervention without permanent genomic alteration."\n\n## Direct RNA Cleavage Systems\n\nUnlike traditional Cas9 variants that target double-stranded DNA, Cas13 nucleases operate exclusively on single-stranded RNA substrates. Recent clinical trials demonstrate non-invasive delivery mechanisms targeting pulmonary epithelium.`
      },
      {
        title: 'James Webb Space Telescope Uncovers Primordial Black Holes at Cosmic Dawn',
        stream: 'Science',
        cover_image_path: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=600&auto=format&fit=crop',
        content: `> "Observations from redshift z > 10 reveal supermassive objects far earlier than standard cosmological accretion models predicted."\n\n## Challenging Stellar Evolution Timelines\n\nHigh-resolution infrared spectra captured by the James Webb Space Telescope have revealed fully formed supermassive black holes within 400 million years of the Big Bang.`
      },
      {
        title: 'Global Supply Chain Re-Shoring: How Robotics and AI Reshape Manufacturing Economics',
        stream: 'Business',
        cover_image_path: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=600&auto=format&fit=crop',
        content: `> "Automated fabrication nodes are neutralizing legacy labor arbitrage advantages across global manufacturing hubs."\n\n## The Reshoring Revolution\n\nMultinational enterprises are increasingly shifting production closer to domestic consumer markets.`
      }
    ];

    for (const art of defaultArticles) {
      await database.run(
        'INSERT INTO blogs (title, content, cover_image_path, stream, author_id) VALUES (?, ?, ?, ?, ?)',
        [art.title, art.content, art.cover_image_path, art.stream, defaultAuthorId]
      );
    }
    console.log('✓ Auto-seeded initial default articles successfully.');
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
