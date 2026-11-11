const js = require('@eslint/js');
const globals = require('globals');
module.exports = [
  { ignores: ['dist/**','node_modules/**','web/**','docs/**','supabase/**'] },
  { files: ['**/*.js','**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { ...globals.browser, ...globals.node, supabaseClient: 'readonly', SUPABASE_URL: 'readonly', SUPABASE_ANON_KEY: 'readonly' } }, rules: { ...js.configs.recommended.rules, 'no-unused-vars':'off', 'no-empty':['error',{allowEmptyCatch:true}] } }
];
