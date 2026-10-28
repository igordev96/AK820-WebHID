// Syntax-check the page's inline script without a browser.
//   node tools/check-js.js index.html
const fs = require('fs');
const vm = require('vm');

const file = process.argv[2];
if (!file) {
  console.error('usage: node check-js.js <page.html>');
  process.exit(2);
}
const html = fs.readFileSync(file, 'utf8');
const start = html.indexOf('<script>');
const end = html.lastIndexOf('</script>');
if (start < 0 || end < start) {
  console.error('no inline <script> block found');
  process.exit(1);
}
const src = html.slice(start + '<script>'.length, end);
try {
  new vm.Script(src, { filename: file });
  console.log(`JS syntax OK (${src.split('\n').length} lines)`);
} catch (e) {
  console.error(`${e.name}: ${e.message}`);
  process.exit(1);
}
