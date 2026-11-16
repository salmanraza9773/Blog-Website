const assert = require('assert');
const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('====================================================');
  console.log('   DEVOPS & SERVERLESS INTEGRATION TEST SUITE       ');
  console.log('====================================================\n');

  let passed = 0;
  let total = 0;

  function test(name, fn) {
    total++;
    try {
      fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}`);
      console.error(`  Error: ${err.message}`);
    }
  }

  async function asyncTest(name, fn) {
    total++;
    try {
      await fn();
      console.log(`✓ [PASS] ${name}`);
      passed++;
    } catch (err) {
      console.error(`✗ [FAIL] ${name}`);
      console.error(`  Error: ${err.message}`);
    }
  }

  // TEST 1: vercel.json root configuration
  test('vercel.json exists and routes /api/(.*) to /api/index.js & static files to /public', () => {
    const vercelPath = path.join(__dirname, '../vercel.json');
    assert(fs.existsSync(vercelPath), 'vercel.json must exist in root directory');
    const content = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));

    assert(content.version === 2, 'vercel.json must specify version: 2');
    assert(content.rewrites && Array.isArray(content.rewrites), 'rewrites must be an array');

    const apiRewrite = content.rewrites.find(r => r.source === '/api/(.*)');
    assert(apiRewrite, 'Rewrite for /api/(.*) must exist');
    assert(apiRewrite.destination === '/api/index.js', 'Destination for /api/(.*) must be /api/index.js');

    const staticRewrite = content.rewrites.find(r => r.source === '/(.*)');
    assert(staticRewrite, 'Rewrite for /(.*) must exist');
    assert(staticRewrite.destination === '/public/$1', 'Destination for /(.*) must be /public/$1');
  });

  // TEST 2: server/app.js modular export without calling app.listen()
  test('server/app.js exports Express application without starting a server listener', () => {
    const appPath = path.join(__dirname, '../server/app.js');
    assert(fs.existsSync(appPath), 'server/app.js must exist');

    // Requiring app.js should NOT throw and should NOT hang listening on a port
    const app = require('../server/app.js');
    assert(typeof app === 'function', 'server/app.js must export Express app function');
    assert(typeof app.use === 'function', 'exported app must have .use method');
    assert(typeof app.get === 'function', 'exported app must have .get method');
  });

  // TEST 3: api/index.js imports server/app.js and exports it
  test('api/index.js exports Express application from server/app.js', () => {
    const apiIndexPath = path.join(__dirname, '../api/index.js');
    assert(fs.existsSync(apiIndexPath), 'api/index.js must exist');

    const serverlessEntry = require('../api/index.js');
    assert(typeof serverlessEntry === 'function', 'api/index.js must export Express app');
  });

  // TEST 4: Database configuration switch in server/db.js
  await asyncTest('server/db.js reads connection details from environment variables (remote & local fallback)', async () => {
    const dbModule = require('../server/db.js');
    assert(typeof dbModule.getDbConfig === 'function', 'db.js must export getDbConfig');
    assert(typeof dbModule.initDB === 'function', 'db.js must export initDB');

    // Default configuration (no remote env set)
    const localConfig = dbModule.getDbConfig();
    assert(localConfig.isRemote === false, 'Default config must resolve to local fallback');
    assert(localConfig.targetType.includes('sqlite') || localConfig.targetType.includes('local'), 'Target type must be local sqlite');

    // Test remote environment switch simulation
    const originalEnv = process.env.DATABASE_URL;
    try {
      process.env.DATABASE_URL = 'postgres://user:pass@remote-neon-db.com/blog';
      const remoteConfig = dbModule.getDbConfig();
      assert(remoteConfig.isRemote === true, 'Setting DATABASE_URL must activate remote mode');
      assert(remoteConfig.targetType === 'postgres', 'Postgres URL must set targetType to postgres');

      process.env.DATABASE_URL = 'https://my-bucket.s3.amazonaws.com/blog.db';
      const httpConfig = dbModule.getDbConfig();
      assert(httpConfig.isRemote === true, 'Setting HTTP DATABASE_URL must activate remote mode');
      assert(httpConfig.targetType === 'remote_http', 'HTTP URL must set targetType to remote_http');
    } finally {
      if (originalEnv) {
        process.env.DATABASE_URL = originalEnv;
      } else {
        delete process.env.DATABASE_URL;
      }
    }

    // Initialize DB with local engine to verify functionality
    const db = await dbModule.initDB();
    assert(db, 'initDB must return a database instance');
    const row = await db.get('SELECT COUNT(*) as count FROM blogs');
    assert(row && typeof row.count === 'number', 'Must be able to query blogs count from DB');
  });

  // TEST 5: External cover image URL support in routes
  await asyncTest('Articles support direct external cover image URLs (e.g., Unsplash, Cloudinary)', async () => {
    const dbModule = require('../server/db.js');
    const db = await dbModule.initDB();

    // Verify existing seed articles use external Unsplash URLs
    const sampleArticle = await db.get('SELECT cover_image_path FROM blogs WHERE cover_image_path LIKE "http%" LIMIT 1');
    assert(sampleArticle, 'Seed articles should include external image URLs');
    assert(sampleArticle.cover_image_path.startsWith('https://images.unsplash.com/'), 'Seed article cover image must be an external URL');

    // Test inserting an article with an external Cloudinary URL directly into the DB
    const testCloudinaryUrl = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
    const res = await db.run(
      'INSERT INTO blogs (title, content, cover_image_path, stream, author_id) VALUES (?, ?, ?, ?, ?)',
      ['Serverless External Image Test', 'Testing external cover image', testCloudinaryUrl, 'Technology', 1]
    );
    assert(res.lastID, 'Inserted test article must have a valid lastID');

    const inserted = await db.get('SELECT cover_image_path FROM blogs WHERE id = ?', [res.lastID]);
    assert.strictEqual(inserted.cover_image_path, testCloudinaryUrl, 'Article must store and return the external Cloudinary image URL');

    // Clean up test article
    await db.run('DELETE FROM blogs WHERE id = ?', [res.lastID]);
  });

  // TEST 6: package.json scripts include proper start and build scripts
  test('package.json scripts include "start", "build", and "test"', () => {
    const pkgPath = path.join(__dirname, '../package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));

    assert(pkg.scripts, 'scripts object must exist in package.json');
    assert(pkg.scripts.start, 'scripts.start must exist');
    assert(pkg.scripts.start.includes('server/server.js'), 'scripts.start should run server/server.js');
    assert(pkg.scripts.build, 'scripts.build must exist for Vercel deployment');
    assert(pkg.scripts.test, 'scripts.test must exist');
  });

  // TEST 7: Root-relative paths for all CSS and JS assets in public/
  test('All HTML files in public/ use root-relative paths (/css/styles.css, /js/...)', () => {
    const publicDir = path.join(__dirname, '../public');
    const htmlFiles = fs.readdirSync(publicDir).filter(f => f.endsWith('.html'));

    assert(htmlFiles.length > 0, 'public directory must contain HTML files');

    const relativePattern = /(?:href|src)=["'](css|js)\//;
    const rootRelativePattern = /(?:href|src)=["']\/(css|js)\//;

    for (const file of htmlFiles) {
      const content = fs.readFileSync(path.join(publicDir, file), 'utf8');

      // Check no relative asset links exist
      const relMatch = content.match(relativePattern);
      assert(!relMatch, `File ${file} contains relative asset link: ${relMatch ? relMatch[0] : ''}`);

      // If the file loads CSS or JS, check that it uses root-relative links
      if (content.includes('styles.css') || content.includes('.js')) {
        const rootMatch = content.match(rootRelativePattern);
        assert(rootMatch, `File ${file} must have root-relative asset link (/css/ or /js/)`);
      }
    }
  });

  // TEST 8: Express application routes smoke test
  await asyncTest('Express routes respond with valid status codes', async () => {
    const app = require('../server/app.js');

    // Test simulated request to /api/health
    const reqMock = { method: 'GET', url: '/api/health', headers: {} };
    let resMockStatus = null;
    let resMockData = null;

    await new Promise((resolve) => {
      const resMock = {
        status(code) {
          resMockStatus = code;
          return this;
        },
        json(data) {
          resMockData = data;
          resolve();
        },
        setHeader() {},
        end() { resolve(); }
      };

      app.handle(reqMock, resMock, () => resolve());
    });

    assert.strictEqual(resMockData && resMockData.status, 'ok', 'Health endpoint should return status: ok');
  });

  // TEST 9: Admin Gatekeeper Public Security Audit (no secrets, passkeys, or auto-fill buttons exposed)
  test('Admin Gatekeeper does not expose passkey or auto-fill options in public files', () => {
    const publicDir = path.join(__dirname, '../public');
    function scanDir(dir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
          scanDir(fullPath);
        } else if (file.endsWith('.html') || file.endsWith('.js')) {
          const content = fs.readFileSync(fullPath, 'utf8');
          assert(!content.includes('AdminMasterKey_2026!'), `Secret passkey found in public file ${file}!`);
          assert(!content.includes('btnAutoFillPasskey'), `Auto-fill passkey button found in public file ${file}!`);
          assert(!content.includes('Auto-Fill'), `Auto-Fill text found in public file ${file}!`);
        }
      }
    }
    scanDir(publicDir);
  });

  // TEST 10: Admin Gatekeeper API Security
  await asyncTest('Admin login requires valid passkey and rejects unauthorized attempts', async () => {
    const app = require('../server/app.js');

    async function makePostRequest(url, body) {
      let resStatus = 200;
      let resData = null;
      await new Promise((resolve) => {
        const reqMock = {
          method: 'POST',
          url,
          headers: { 'content-type': 'application/json' },
          body
        };
        const resMock = {
          status(code) {
            resStatus = code;
            return this;
          },
          json(data) {
            resData = data;
            resolve();
          },
          setHeader() {},
          end() { resolve(); }
        };
        app.handle(reqMock, resMock, () => resolve());
      });
      return { status: resStatus, data: resData };
    }

    // 1. Missing passkey must be rejected with 400
    const emptyRes = await makePostRequest('/api/admin/login', {});
    assert.strictEqual(emptyRes.status, 400, 'Login without passkey must return 400');

    // 2. Invalid passkey must be rejected with 401
    const invalidRes = await makePostRequest('/api/admin/login', { passkey: 'WrongSecretKey_123!' });
    assert.strictEqual(invalidRes.status, 401, 'Login with incorrect passkey must return 401');

    // 3. Valid master passkey alone must succeed with 200 and return super_admin token
    const validKey = process.env.ADMIN_SECRET_KEY || 'AdminMasterKey_2026!';
    const validRes = await makePostRequest('/api/admin/login', { passkey: validKey });
    assert.strictEqual(validRes.status, 200, 'Login with valid passkey must return 200');
    assert(validRes.data && validRes.data.token, 'Response must include JWT session token');
    assert.strictEqual(validRes.data.user.role, 'super_admin', 'User must have super_admin role');
  });

  console.log('\n====================================================');
  console.log(`TEST SUMMARY: ${passed}/${total} passed (${Math.round((passed/total)*100)}%)`);
  console.log('====================================================\n');

  if (passed !== total) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
