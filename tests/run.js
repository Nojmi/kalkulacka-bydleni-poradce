// Spuštění: node tests/run.js
const calc = require('../js/calc.js');
const cases = require('./cases.js');
let fail = 0;
for (const c of cases) {
  const got = c.actual(calc);
  const ok = Math.abs(got - c.expected) <= 0.011;
  if (!ok) fail++;
  console.log((ok ? 'OK   ' : 'FAIL ') + c.name + '\n       očekáváno ' + c.expected + ', vyšlo ' + got.toFixed(2));
}
console.log('\n' + (cases.length - fail) + '/' + cases.length + ' kontrolních příkladů sedí.');
process.exit(fail ? 1 : 0);
