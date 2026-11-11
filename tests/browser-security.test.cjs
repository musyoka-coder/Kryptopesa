const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const config = require('../vercel.json');
const headers = Object.fromEntries(config.headers[0].headers.map(h => [h.key.toLowerCase(),h.value]));
test('response headers prohibit framing, MIME sniffing and wildcard CORS', () => {
  assert.equal(headers['x-frame-options'],'DENY');
  assert.equal(headers['x-content-type-options'],'nosniff');
  assert.equal(headers['access-control-allow-origin'],'https://www.kryptopesa.app');
  assert.match(headers['content-security-policy'], /frame-ancestors 'none'/);
  const scripts = headers['content-security-policy'].split(';').find(d=>d.trim().startsWith('script-src '));
  assert.doesNotMatch(scripts,/unsafe-inline|unsafe-eval/);
});
for (const file of fs.readdirSync('.').filter(f=>f.endsWith('.html'))) {
  test(`${file}: scripts execute under the restrictive policy`, () => {
    const html=fs.readFileSync(file,'utf8');
    assert.doesNotMatch(html,/\son\w+\s*=|javascript:/i);
    for (const [,attrs,body] of html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)) {
      const src=attrs.match(/src="([^"]+)"/);
      if (!src) {
        assert.match(attrs,/application\/ld\+json/);
        const hash=crypto.createHash('sha256').update(body).digest('base64');
        assert.ok(headers['content-security-policy'].includes(`'sha256-${hash}'`));
      } else if (!src[1].startsWith('https:')) {
        assert.ok(fs.existsSync(path.resolve(src[1])),src[1]);
        new vm.Script(fs.readFileSync(src[1],'utf8'),{filename:src[1]});
      } else {
        assert.match(src[1],/^https:\/\/cdn\.jsdelivr\.net\/npm\/@supabase\/supabase-js@\d+\.\d+\.\d+\//);
        assert.match(attrs,/integrity="sha384-/);
      }
    }
  });
}
