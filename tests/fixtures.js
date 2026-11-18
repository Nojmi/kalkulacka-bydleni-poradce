/* Pevní klienti pro automatické testy. Čísla v tests/cases.js jsou ověřena nezávisle (docs/overeni-hodnot.py).
   V aplikaci se NEPOUŽÍVAJÍ, aplikace má vlastní ukázkové klienty v js/model.js (samples). */
const KB=require('../js/model.js');
const {mkClient,mkVar,L}=KB;
function samples(){const now=Date.now(),H=3600000,D=86400000;return [
 mkClient({sample:true,updated:now-2*H,name:'Novákovi',note:'Chtějí větší byt kvůli druhému dítěti. Starý byt by rádi pronajímali.',savings:2600000,
  incomes:[L('Mzda – Karel',64000),L('Mzda – Eva',46000)],
  expenses:[L('Jídlo a drogerie',16000),L('Doprava',5500),L('Telefon a internet',1400),L('Děti (školka, kroužky)',6000),L('Oblečení',2500),L('Volný čas',4000),L('Spoření a investice',5000)],
  annual:[L('Pojištění auta',14000),L('Dovolená',60000),L('Dárky a svátky',15000),L('Servis auta',12000),L('Ostatní',10000)],
  t:{flat:true,mort:true,fix:true,rent:true,buy:true,annual:true},
  flat:{est:6200000,purchase:3900000,ops:[L('Fond oprav a správa',3800),L('Energie',3200),L('Pojištění nemovitosti',350)],mort:{balance:2400000,rate:2.19,months:216,ins:520},fix:{months:8,rate:4.89},sale:{comm:3,costs:40000,exempt:true},rent:{rent:21000,vac:8,repairs:15000,tax:'B'}},
  variants:[mkVar('Žižkov 3+1',6900000,{acq:110000,reno:[160000,190000,70000,30000,0,0,20000,0,0,20000],savReno:500000,savMort:1500000,insSold:450,insKept:680,ops:[4100,3600,380,120]}),
   mkVar('Vinohrady 3+kk',8400000,{acq:130000,reno:[180000,220000,90000,35000,60000,0,25000,0,40000,30000],savReno:600000,savMort:1800000,insSold:520,insKept:760,ops:[4600,3900,420,150]}),
   mkVar('Černošice – řadový dům',9600000,{acq:140000,reno:[0,120000,0,40000,0,60000,0,0,0,30000],savReno:250000,savMort:2350000,rate:4.69,insSold:560,insKept:820,ops:[0,5200,650,180]})]}),
 mkClient({sample:true,updated:now-D,name:'Horákovi',note:'Prodej bytu na Pankráci, hledají větší bydlení. Šest kandidátů po prohlídkách.',savings:900000,
  incomes:[L('Mzda – Martin',62000),L('Mzda – Lucie',48000)],
  expenses:[L('Jídlo a drogerie',15000),L('Doprava',6000),L('Telefon a internet',1500),L('Děti',7000),L('Oblečení',3000),L('Volný čas',5000),L('Ostatní',3000)],
  annual:[L('Pojištění aut',22000),L('Dovolená',70000),L('Dárky a svátky',18000),L('Servis aut',15000),L('Ostatní',12000)],
  t:{flat:true,mort:true,fix:true,sell:true,buy:true,annual:true},useRefix:false,
  flat:{est:7800000,purchase:4100000,ops:[L('Fond oprav a správa',4200),L('Energie',3500),L('Pojištění nemovitosti',400)],mort:{balance:1200000,rate:1.89,months:120,ins:300},fix:{months:14,rate:4.6},sale:{comm:3,costs:50000,exempt:true}},
  variants:[mkVar('Dejvice 4+kk',9200000,{acq:130000,reno:[200000,250000,120000,40000,80000,60000,30000,0,50000,20000],savReno:500000,savMort:300000,insSold:400,ops:[4800,4000,450,160]}),
   mkVar('Smíchov 3+1',8100000,{acq:120000,reno:[150000,180000,0,30000,0,0,0,0,0,20000],savReno:380000,savMort:400000,insSold:350,ops:[4300,3600,400,140]}),
   mkVar('Říčany – dům',8900000,{acq:130000,reno:[0,0,0,50000,0,0,0,0,0,30000],savReno:80000,savMort:700000,insSold:380,ops:[0,5600,700,200]}),
   mkVar('Braník 4+1',9500000,{acq:140000,reno:[220000,260000,140000,50000,90000,80000,40000,120000,60000,30000],savReno:600000,savMort:200000,insSold:420,ops:[4900,4100,460,160]}),
   mkVar('Černošice – dům se zahradou',9900000,{acq:145000,reno:[0,150000,0,40000,0,0,0,0,0,20000],savReno:210000,savMort:500000,rate:4.69,insSold:430,ops:[0,6200,800,220]}),
   mkVar('Holešovice – loft',10000000,{acq:150000,savMort:800000,insSold:450,ops:[5600,3800,480,170]})]}),
 mkClient({sample:true,updated:now-3*D,name:'Jana Malá',note:'Prodej bytu v Brně. Hypotéka je vysoká vůči hodnotě bytu, malé úspory.',savings:300000,
  incomes:[L('Mzda',54000),L('Přivýdělek – lektorka',6000)],
  expenses:[L('Jídlo a drogerie',9000),L('Doprava',3000),L('Telefon a internet',900),L('Pes',1500),L('Oblečení',1800),L('Volný čas',3000),L('Ostatní',2000)],
  annual:[L('Pojištění auta',9000),L('Dovolená',25000),L('Dárky a svátky',8000),L('Servis auta',6000),L('Ostatní',5000)],
  t:{flat:true,mort:true,sell:true,buy:true,annual:true},
  flat:{est:5100000,purchase:4300000,ops:[L('Fond oprav a správa',3200),L('Energie',2100),L('Pojištění nemovitosti',250)],mort:{balance:4820000,rate:5.39,months:336,ins:610},sale:{comm:3.5,costs:60000,exempt:false}},
  variants:[mkVar('Brno – Žabovřesky 2+1',5600000,{acq:90000,reno:[120000,150000,60000,25000,0,0,0,0,0,15000],savReno:200000,savMort:200000,rate:5.09,insSold:520,ops:[3100,2200,260,90]}),
   mkVar('Brno – Líšeň, novostavba 3+kk',6900000,{acq:120000,reno:[0,0,0,0,0,0,0,0,80000,20000],savReno:100000,savMort:200000,rate:5.09,insSold:610,ops:[3600,2400,300,110]})]}),
 mkClient({sample:true,updated:now-6*D,name:'Petr Dvořák',note:'Dnes v nájmu, první vlastní byt.',savings:1200000,
  incomes:[L('Mzda',78000)],
  expenses:[L('Jídlo a drogerie',8000),L('Doprava',4500),L('Telefon a internet',800),L('Sport',2500),L('Oblečení',1500),L('Volný čas',3500),L('Ostatní',2000)],
  annual:[L('Pojištění auta',11000),L('Dovolená',40000),L('Dárky a svátky',6000),L('Servis auta',8000),L('Ostatní',5000)],
  t:{buy:true,annual:true},
  variants:[mkVar('Praha 9 – Vysočany 2+kk',6500000,{acq:90000,reno:[0,0,80000,20000,0,0,0,0,0,10000],savReno:110000,savMort:1040000,insSold:420,ops:[3400,2600,300,100]})]}),

 mkClient({sample:true,updated:now-10*60000,name:'Prázdný klient (ukázka)'})];}
module.exports={samples};
