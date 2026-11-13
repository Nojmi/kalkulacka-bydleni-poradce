#!/usr/bin/env node
const cases=require('./cases.js');
let bad=0;
cases.forEach(c=>{try{c.fn();console.log('  ok   '+c.name);}catch(e){bad++;console.log('  CHYBA '+c.name+'\n         '+e.message);}});
console.log('\n'+(cases.length-bad)+' / '+cases.length+' v pořádku');
process.exit(bad?1:0);
