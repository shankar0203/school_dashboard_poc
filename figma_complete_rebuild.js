/**
 * VIDYAM SCHOOL PLATFORM — FIGMA COMPLETE REBUILD
 * 47 Screens × 6 Roles (Student, Teacher, Parent, Principal, School Admin, Owner)
 * Run in Figma console (School POC file) — paste each STEP in order
 *
 * STEP 1: Clear + Helpers
 * STEP 2: Student (8 screens)
 * STEP 3: Teacher (8 screens)
 * STEP 4: Parent (7 screens)
 * STEP 5: Principal (8 screens)
 * STEP 6: School Admin (8 screens)
 * STEP 7: Owner (8 screens)
 * STEP 8: Validation
 */

// ════════════════════════════════════════════════════════════════════
// STEP 1 — CLEAR ALL + DEFINE HELPERS
// ════════════════════════════════════════════════════════════════════
await Promise.all([
  figma.loadFontAsync({family:'Inter',style:'Regular'}),
  figma.loadFontAsync({family:'Inter',style:'Bold'}),
  figma.loadFontAsync({family:'Inter',style:'Medium'}),
  figma.loadFontAsync({family:'Inter',style:'Semi Bold'})
]);

// Clear every frame from every page
figma.root.children.forEach(pg=>[...pg.children].forEach(n=>{try{n.remove();}catch(e){}}));

const G=1504; // 1440px screen + 64px gap

function hex(h){const s=h.replace('#','');return{r:parseInt(s.slice(0,2),16)/255,g:parseInt(s.slice(2,4),16)/255,b:parseInt(s.slice(4,6),16)/255};}
function solid(c){return[{type:'SOLID',color:hex(c)}];}
function R(p,x,y,w,h,c,r=0,n=''){const e=figma.createRectangle();e.x=x;e.y=y;e.resize(w,h);e.name=n||'r';if(r)e.cornerRadius=r;e.fills=c?solid(c):[];p.appendChild(e);return e;}
function T(p,x,y,v,s,c,st='Regular',n=''){const e=figma.createText();e.fontName={family:'Inter',style:st};e.fontSize=s;e.characters=String(v);e.x=x;e.y=y;e.fills=solid(c||'#111827');e.name=n||String(v).slice(0,16);p.appendChild(e);return e;}
function F(p,x,y,w,h,c,r=0,n=''){const f=figma.createFrame();f.x=x;f.y=y;f.resize(w,h);f.name=n||'f';f.cornerRadius=r;f.fills=c?solid(c):[];f.clipsContent=true;p.appendChild(f);return f;}
function C(p,x,y,w,h,n=''){return F(p,x,y,w,h,'#FFFFFF',12,n);}

/** Sidebar with active nav highlighting */
function SB(p,role,nav,ac,active){
  const a=active||nav[0];
  const sb=F(p,0,0,240,900,'#1B2B4B',0,'Sidebar');
  R(sb,0,0,240,64,'#0F1E36',0,'lb');
  T(sb,16,17,'VidyaM',20,'#FFFFFF','Bold');
  T(sb,16,41,'School Platform',9,ac,'Medium');
  R(sb,12,76,216,56,'#FFFFFF15',8,'uc');
  const av=F(sb,20,83,40,40,ac+'55',20,'av');
  T(av,9,7,role[0],20,ac,'Bold');
  T(sb,68,83,role.length>17?role.slice(0,16)+'…':role,12,'#FFFFFF','Semi Bold');
  T(sb,68,101,'● Online',10,'#34D399');
  nav.forEach((item,i)=>{
    const isA=item===a;const y=148+i*44;
    if(isA){R(sb,0,y,240,42,ac+'44',0,'ab');R(sb,0,y,3,42,ac,0,'as');}
    T(sb,22,y+13,item.length>18?item.slice(0,17)+'…':item,12,isA?'#FFFFFF':'#94A3B8',isA?'Semi Bold':'Regular','n'+i);
  });
}

/** Header bar */
function HDR(p,title,sub,bdg=0){
  const h=C(p,240,0,1200,64,'Hdr');
  R(h,0,0,1200,64,'#FFFFFF',0,'hbg');R(h,0,63,1200,1,'#E5E7EB');
  T(h,24,14,title,17,'#111827','Bold');T(h,24,38,sub,11,'#6B7280');
  R(h,1096,20,28,24,'#F3F4F6',8,'bell');T(h,1101,24,'🔔',13,'#111827');
  if(bdg>0){R(h,1112,16,18,18,'#EF4444',9,'nb');T(h,1115,19,String(bdg),8,'#FFFFFF','Bold');}
  R(h,1136,20,28,24,'#F3F4F6',8,'ava');T(h,1141,24,'👤',13,'#111827');
}

/** Stat card (4 per row at top of content area) */
function SC(p,x,y,w,lbl,val,sub,ac){
  const c=C(p,x,y,w,108,'sc');
  R(c,0,0,w,4,ac,0,'t');
  T(c,16,14,lbl,11,'#6B7280','Medium');
  T(c,16,32,String(val),24,'#111827','Bold');
  T(c,16,66,sub,10,'#9CA3AF');
  return c;
}

/** Filter tabs row */
function FTABS(p,y,tabs,ac){
  const tw=Math.floor(1128/tabs.length);
  tabs.forEach((t,i)=>{
    const a=i===0,x=264+12+i*tw;
    R(p,x,y,tw-6,36,a?ac:'#F3F4F6',8,t);
    T(p,x+10,y+10,t,12,a?'#FFFFFF':'#6B7280',a?'Semi Bold':'Regular');
  });
}

/** Table header row */
function THDR(p,y,cols,xs){
  const def=[280,460,620,780,940,1100];const ox=xs||def;
  R(p,264,y,1152,40,'#F8FAFC',0,'th');
  cols.forEach((h,i)=>T(p,ox[i],y+13,h,11,'#6B7280','Semi Bold'));
}

/** Notification rows (8 items from y=136, each 80px tall) */
function NOTIFROWS(p,items,ac){
  items.forEach(([ico,title,body,time,c2,unread],i)=>{
    const y=136+i*80;const nc=C(p,264,y,1152,72,'n'+i);
    R(nc,0,0,1152,72,unread?ac+'15':'#FFFFFF',0);if(unread)R(nc,0,0,3,72,ac,0,'u');
    const fi=F(nc,14,16,36,36,c2+'22',18,'ic');T(fi,8,8,ico,16,'#111827');
    T(nc,60,10,title,13,'#111827',unread?'Bold':'Medium');
    T(nc,60,28,String(body).slice(0,82),11,'#6B7280');
    T(nc,60,50,time,10,'#9CA3AF');
    const bl=unread?'New':'Read';const bw=bl.length*7+16;
    R(nc,1152-bw-16,22,bw,26,unread?ac+'22':'#F3F4F6',8,'b');
    T(nc,1152-bw-8,27,bl,10,unread?ac:'#374151','Medium');
  });
}

/** Complete Storage screen builder */
function STORAGESCR(frame,role,nav,ac,usedMB,files){
  SB(frame,role,nav,ac,'Storage');HDR(frame,'My Storage Space','2 GB Limit • AWS S3 • AES-256 Encrypted');
  const total=2048,pct=Math.round(usedMB/total*100);
  const pc=pct>=80?'#EF4444':pct>=60?'#F59E0B':'#10B981';
  const mc=C(frame,264,80,1152,136,'M');
  T(mc,24,14,'Storage Usage — '+pct+'% ('+usedMB+' MB / '+total+' MB)',15,pc,'Bold');
  T(mc,24,40,'AWS S3 • Bucket: vidyam-school-storage-prod • Region: ap-south-1 (Mumbai)',12,'#9CA3AF');
  R(mc,24,68,1104,20,'#F3F4F6',10,'bg');R(mc,24,68,Math.round(1104*pct/100),20,pc,10,'f');
  T(mc,24,98,(total-usedMB)+' MB remaining',12,pc,'Bold');
  if(pct>=60){R(mc,980,90,140,34,ac,8,'up');T(mc,996,101,'↑ Upgrade',12,'#FFFFFF','Semi Bold');}
  const bk=C(frame,264,236,548,452,'Bk');
  T(bk,20,18,'Storage by Type',14,'#111827','Bold');R(bk,0,42,548,1,'#F3F4F6');
  [['📄 Documents',0.42,ac],['🎥 Videos',0.28,'#8B5CF6'],['🖼️ Images',0.18,'#10B981'],['📦 Others',0.12,'#F59E0B']].forEach(([label,frac,c2],i)=>{
    const sz=Math.round(usedMB*frac),y=52+i*96;
    R(bk,14,y,520,84,c2+'0D',8);T(bk,22,y+10,label,13,'#111827','Semi Bold');T(bk,22,y+28,sz+' MB',12,'#6B7280');
    R(bk,22,y+56,484,10,'#F3F4F6',5);R(bk,22,y+56,Math.round(484*frac),10,c2,5);T(bk,480,y+50,Math.round(frac*100)+'%',10,c2,'Bold');
  });
  const rf=C(frame,828,236,588,452,'RF');
  T(rf,20,18,'Recent Files',14,'#111827','Bold');
  R(rf,20,44,120,28,ac,8,'up');T(rf,38,52,'↑ Upload',12,'#FFFFFF','Semi Bold');
  R(rf,0,80,588,1,'#F3F4F6');
  files.forEach(([name,ico,sz,date],i)=>{
    const y=88+i*68;R(rf,8,y,572,60,'#F9FAFB',8);
    const fi=F(rf,16,y+14,28,28,ac+'22',6,'fi');T(fi,4,4,ico,16,'#111827');
    T(rf,54,y+10,name.slice(0,26),12,'#111827','Medium');T(rf,54,y+28,sz+' • '+date,10,'#9CA3AF');
    R(rf,498,y+16,34,26,'#F3F4F6',6);T(rf,506,y+20,'↓',12,'#374151');
  });
  const s3=F(frame,264,704,1152,96,'#0F172A',8,'S3');
  T(s3,24,16,'☁  AWS S3 — vidyam-school-storage-prod',14,'#FFFFFF','Bold');
  T(s3,24,42,'Region: ap-south-1 (Mumbai) • AES-256 Encryption • Versioning: ON • Daily Backup: 02:00 AM IST',12,'#94A3B8');
  T(s3,24,66,'Per-school prefix isolation • GDPR-ready retention policies • 99.99% durability',11,'#64748B');
}

window.__FH={R,T,F,C,SB,HDR,SC,FTABS,THDR,NOTIFROWS,STORAGESCR,hex,solid,G};
console.log('✅ STEP 1 complete — Cleared + Helpers ready');


// ════════════════════════════════════════════════════════════════════
// STEP 2 — STUDENT: 8 SCREENS
// Role: Aarav Sharma | Color: #3B82F6 (Blue)
// Screens: Dashboard, Attendance, Results, Timetable, Fees, Notes, Notifications, Storage
// ════════════════════════════════════════════════════════════════════
{
await Promise.all([figma.loadFontAsync({family:'Inter',style:'Regular'}),figma.loadFontAsync({family:'Inter',style:'Bold'}),figma.loadFontAsync({family:'Inter',style:'Medium'}),figma.loadFontAsync({family:'Inter',style:'Semi Bold'})]);
const {R,T,F,C,SB,HDR,SC,FTABS,THDR,NOTIFROWS,STORAGESCR,G}=window.__FH;
const SP=figma.root.children.find(p=>p.name==='Student');figma.currentPage=SP;
const NAV=['Dashboard','Attendance','Results','Timetable','Fees','Notes','Notifications','Storage'];
const AC='#3B82F6',ROLE='Aarav Sharma';

const s1=F(SP,0,0,1440,900,'#F0F4F8',0,'Student - Dashboard');
SB(s1,ROLE,NAV,AC,'Dashboard');HDR(s1,'Dashboard','Welcome back, Aarav! Here\'s your snapshot for today.',3);
SC(s1,264,80,264,'Attendance','87%','↑ 3% vs last month',AC);SC(s1,540,80,264,'Current GPA','3.8 / 4.0','Rank #12 in class',AC);SC(s1,816,80,264,'Pending Fees','₹5,200','Due: 20 Jul 2026',AC);SC(s1,1092,80,264,'Subjects','7','6 theory, 1 lab',AC);
const tc=C(s1,264,208,564,280,'TC');T(tc,20,14,'Today\'s Classes — Friday 11 Jul',14,'#111827','Bold');R(tc,0,38,564,1,'#F3F4F6');
[['09:00','Mathematics','Rm 12',AC],['10:30','Physics','Lab 2','#8B5CF6'],['12:00','English','Rm 5','#10B981'],['14:00','Chemistry','Lab 1','#F59E0B'],['15:30','PT','Ground','#EF4444']].forEach(([t2,sub,rm,c2],i)=>{const y=46+i*44;R(tc,0,y,564,1,'#F3F4F6');R(tc,12,y+8,4,30,c2,2);T(tc,24,y+8,t2,11,'#9CA3AF');T(tc,24,y+22,sub,13,'#111827','Semi Bold');T(tc,400,y+16,rm,11,'#6B7280');});
const ut=C(s1,844,208,572,280,'UT');T(ut,20,14,'Alerts & Upcoming',14,'#111827','Bold');R(ut,0,38,572,1,'#F3F4F6');
[['💳','Fee due in 9 days — ₹5,200','#EF4444'],['📚','Math assignment due tomorrow','#F59E0B'],['🏆','Results out: 18 Jul','#10B981'],['📅','PTM: 25 Jul 10 AM','#8B5CF6'],['📢','Exam schedule published','#3B82F6']].forEach(([ic,msg,c2],i)=>{const y=46+i*44;R(ut,0,y,572,1,'#F3F4F6');T(ut,14,y+14,ic,14,'#111827');T(ut,38,y+14,msg,12,'#374151');R(ut,460,y+10,12,12,c2,6);});
const rr=C(s1,264,508,1152,268,'RR');T(rr,20,16,'Recent Test Scores',14,'#111827','Bold');R(rr,0,40,1152,1,'#F3F4F6');
[['Mathematics','92/100','A+','#10B981'],['Physics','78/100','B+','#3B82F6'],['Chemistry','71/100','B','#F59E0B'],['Biology','88/100','A-','#10B981'],['English','85/100','A-','#10B981'],['Computer Sci.','94/100','A+','#10B981']].forEach(([sub,score,grade,c2],i)=>{const y=48+i*36;R(rr,0,y,1152,1,'#F3F4F6');T(rr,16,y+10,sub,12,'#374151');T(rr,300,y+10,score,13,'#111827','Bold');R(rr,500,y+6,grade.length*8+12,24,c2+'22',8);T(rr,508,y+11,grade,10,c2,'Bold');});

const s2=F(SP,G,0,1440,900,'#F0F4F8',0,'Student - Attendance');
SB(s2,ROLE,NAV,AC,'Attendance');HDR(s2,'My Attendance','Daily attendance record and monthly summary.');
SC(s2,264,80,264,'Overall %','87%','Academic year 2026-27',AC);SC(s2,540,80,264,'Present Days','132','Out of 152 school days',AC);SC(s2,816,80,264,'Absent Days','20','8 with leave, 12 w/o',AC);SC(s2,1092,80,264,'This Month','91%','Jul 2026 — 10/11 days',AC);
FTABS(s2,204,['All','Present','Absent','Late','Leave Applied'],AC);
const cal=C(s2,264,252,736,440,'Cal');T(cal,20,14,'July 2026 — Attendance Calendar',14,'#111827','Bold');R(cal,0,38,736,1,'#F3F4F6');
['Mon','Tue','Wed','Thu','Fri','Sat'].forEach((d,i)=>T(cal,16+i*118,50,d,11,'#6B7280','Semi Bold'));
[[1,'P'],[2,'P'],[3,'P'],[4,'A'],[5,'P'],[6,'P'],[7,'P'],[8,'P'],[9,'A'],[10,'P'],[11,'P']].forEach(([day,st],i)=>{const row=Math.floor(i/6),col=i%6;const c2=st==='P'?'#D1FAE5':'#FEE2E2';R(cal,14+col*118,68+row*64,106,52,c2,8);T(cal,18+col*118,72+row*64,String(day),11,'#374151');T(cal,18+col*118,84+row*64,st,13,st==='P'?'#10B981':'#EF4444','Bold');});
const ms=C(s2,1016,252,400,440,'MS');T(ms,20,14,'Monthly % — 2026',14,'#111827','Bold');R(ms,0,38,400,1,'#F3F4F6');
[['Jan','96'],['Feb','94'],['Mar','88'],['Apr','91'],['May','85'],['Jun','89'],['Jul','91']].forEach(([m,pct],i)=>{const y=46+i*52;R(ms,0,y,400,1,'#F3F4F6');T(ms,14,y+16,m,13,'#374151');const bw=Math.round(240*parseInt(pct)/100);R(ms,90,y+20,240,12,'#F3F4F6',6);R(ms,90,y+20,bw,12,AC,6);T(ms,340,y+14,pct+'%',12,AC,'Bold');});

const s3=F(SP,G*2,0,1440,900,'#F0F4F8',0,'Student - Results');
SB(s3,ROLE,NAV,AC,'Results');HDR(s3,'My Results','Subject-wise marks and grade report — Term 3 2026.');
SC(s3,264,80,264,'GPA','3.8 / 4.0','Rank #12 of 42',AC);SC(s3,540,80,264,'Highest','94%','Computer Science',AC);SC(s3,816,80,264,'Average','82.8%','Across 7 subjects',AC);SC(s3,1092,80,264,'Grade','A','Distinction: 90%+',AC);
FTABS(s3,204,['Term 3 (Current)','Term 2','Term 1','Full Year'],AC);
THDR(s3,252,['Subject','Term 1','Term 2','Term 3','Grade','Trend'],[280,460,580,700,820,940]);
[['Mathematics','88%','85%','92%','A','↑ Improving'],['Physics','79%','74%','78%','B+','↑ Improving'],['Chemistry','68%','72%','71%','B','→ Stable'],['Biology','82%','86%','88%','A-','↑ Improving'],['English','80%','83%','85%','A-','↑ Improving'],['History','75%','77%','80%','B+','↑ Improving'],['Computer Sci.','91%','89%','94%','A+','↑ Top Score']].forEach(([sub,t1,t2,t3,grade,trend],i)=>{
  const y=300+i*52;R(s3,264,y,1152,1,'#F3F4F6');R(s3,264,y,1152,50,'#FFFFFF',0);
  T(s3,280,y+17,sub,12,'#374151','Semi Bold');T(s3,460,y+17,t1,12,'#374151');T(s3,580,y+17,t2,12,'#374151');T(s3,700,y+17,t3,13,AC,'Bold');
  const gc=grade.startsWith('A')?'#10B981':'#F59E0B';R(s3,812,y+13,grade.length*8+12,26,gc+'22',8);T(s3,820,y+18,grade,10,gc,'Bold');
  T(s3,940,y+17,trend,11,'#6B7280');
});

const s4=F(SP,G*3,0,1440,900,'#F0F4F8',0,'Student - Timetable');
SB(s4,ROLE,NAV,AC,'Timetable');HDR(s4,'My Timetable','Weekly class schedule — Term 3, Academic Year 2026-27.');
const tdays=['Mon','Tue','Wed','Thu','Fri'];
const tsch=[['Math','Phy','Chem','Bio','CS'],['Eng','Math','Phy','CS','Bio'],['Chem','Eng','Math','Phy','Eng'],['Bio','CS','Eng','Math','Chem'],['Phy','Chem','Bio','Eng','Math'],['PT','PT','CS','Chem','Phy'],['Lib','Lib','PT','PT','Free']];
const tcolors={'Math':AC,'Phy':'#8B5CF6','Chem':'#F59E0B','Bio':'#10B981','CS':'#06B6D4','Eng':'#EF4444','PT':'#F97316','Lib':'#6B7280','Free':'#F3F4F6'};
const tperiods=['8:00 – 9:00','9:00 – 10:00','10:15 – 11:15','11:15 – 12:15','1:00 – 2:00','2:00 – 3:00','3:15 – 4:15'];
R(s4,264,80,1152,40,'#F8FAFC',0,'th');T(s4,270,93,'Period',11,'#6B7280','Semi Bold');
tdays.forEach((d,i)=>T(s4,440+i*180,93,d,12,'#6B7280','Semi Bold'));
tperiods.forEach((per,pi)=>{const y=120+pi*96;R(s4,264,y,1152,1,'#F3F4F6');R(s4,264,y,1152,94,'#FFFFFF');T(s4,272,y+16,per,11,'#9CA3AF');tdays.forEach((d,di)=>{const sub=tsch[pi][di];const c2=tcolors[sub]||'#F3F4F6';const isEmpty=sub==='Lib'||sub==='Free';R(s4,420+di*180,y+8,168,78,isEmpty?'#F8FAFC':c2+'18',8);if(!isEmpty){R(s4,420+di*180,y+8,4,78,c2,4,'ac');}T(s4,432+di*180,y+28,sub,14,isEmpty?'#CBD5E1':c2,'Bold');if(!isEmpty)T(s4,432+di*180,y+48,'Room '+(pi*2+di+1),11,'#94A3B8');});});

const s5=F(SP,G*4,0,1440,900,'#F0F4F8',0,'Student - Fees');
SB(s5,ROLE,NAV,AC,'Fees');HDR(s5,'Fee Management','Annual fee breakdown, payment history and dues.',1);
SC(s5,264,80,264,'Annual Total','₹45,000','Year 2026-27',AC);SC(s5,540,80,264,'Paid','₹39,800','Last: ₹12,200 — 01 Jul',AC);SC(s5,816,80,264,'Pending','₹5,200','Due: 20 Jul 2026',AC);SC(s5,1092,80,264,'Instalment','4 of 4','Q4 due',AC);
FTABS(s5,204,['All','Paid','Pending','Receipts'],AC);
R(s5,1104,208,272,36,'#EF4444',8,'pay');T(s5,1120,220,'💳 Pay Now — ₹5,200',13,'#FFFFFF','Semi Bold');
THDR(s5,252,['Invoice #','Description','Amount','Due Date','Paid On','Status'],[280,430,600,740,880,1020]);
[['INV-2026-001','Q1 Tuition + Activity Fee','₹15,200','01 Jan 2026','05 Jan 2026','Paid'],['INV-2026-002','Q2 Tuition + Lab Fee','₹12,400','01 Apr 2026','01 Apr 2026','Paid'],['INV-2026-003','Q3 Tuition + Sports Fee','₹12,200','01 Jul 2026','03 Jul 2026','Paid'],['INV-2026-004','Q4 Tuition + Exam Fee','₹5,200','20 Jul 2026','—','Pending']].forEach(([inv,desc,amt,due,paid,status],i)=>{
  const y=300+i*52;R(s5,264,y,1152,1,'#F3F4F6');R(s5,264,y,1152,50,'#FFFFFF');
  T(s5,280,y+17,inv,12,'#374151');T(s5,430,y+17,desc.slice(0,22),12,'#374151');T(s5,600,y+17,amt,13,'#111827','Bold');T(s5,740,y+17,due,12,'#374151');T(s5,880,y+17,paid,12,'#374151');
  const sc2=status==='Paid'?'#10B981':'#EF4444';R(s5,1012,y+13,status.length*7+14,26,sc2+'22',8);T(s5,1020,y+18,status,10,sc2,'Bold');
});

const s6=F(SP,G*5,0,1440,900,'#F0F4F8',0,'Student - Notes');
SB(s6,ROLE,NAV,AC,'Notes');HDR(s6,'My Notes','Class notes and study materials uploaded by teachers.');
SC(s6,264,80,264,'Total Notes','47','7 subjects',AC);SC(s6,540,80,264,'Downloaded','23','Last 30 days',AC);SC(s6,816,80,264,'New This Week','6','4 from teachers',AC);SC(s6,1092,80,264,'Storage','108 MB','of 264 MB total',AC);
FTABS(s6,204,['All Subjects','Mathematics','Physics','Chemistry','Biology','English'],AC);
R(s6,1248,208,168,36,AC,8,'up');T(s6,1266,220,'+ Upload',12,'#FFFFFF','Semi Bold');
THDR(s6,252,['Title','Subject','Uploaded By','Date','Size','Action'],[280,500,640,800,940,1060]);
[['Chapter 7 — Calculus Derivatives','Mathematics','Mr. Rajan Kumar','08 Jul','2.4 MB'],['Newton\'s Laws — Full Notes','Physics','Ms. Priya Nair','07 Jul','1.8 MB'],['Periodic Table Reference','Chemistry','Dr. Sita Ram','06 Jul','3.2 MB'],['Photosynthesis Diagrams','Biology','Ms. Kavitha','05 Jul','1.1 MB'],['Shakespeare — Anthology','English','Mr. John D\'Silva','04 Jul','4.6 MB'],['Algebra Formulae Sheet','Mathematics','Mr. Rajan Kumar','03 Jul','0.8 MB'],['Optics Lab Manual','Physics','Ms. Priya Nair','02 Jul','2.2 MB']].forEach(([title,sub,by,date,size],i)=>{
  const y=300+i*52;R(s6,264,y,1152,1,'#F3F4F6');R(s6,264,y,1152,50,'#FFFFFF');
  T(s6,280,y+17,title.slice(0,28),12,'#374151','Medium');T(s6,500,y+17,sub,12,'#374151');T(s6,640,y+17,by.slice(0,18),11,'#374151');T(s6,800,y+17,date,12,'#374151');T(s6,940,y+17,size,12,'#374151');
  R(s6,1052,y+12,84,28,AC+'22',8,'dl');T(s6,1064,y+18,'↓ PDF',12,AC,'Medium');
});

const s7=F(SP,G*6,0,1440,900,'#F0F4F8',0,'Student - Notifications');
SB(s7,ROLE,NAV,AC,'Notifications');HDR(s7,'Notifications','Your school alerts and updates.',3);
FTABS(s7,80,['All','Unread (3)','Fees','Academic','Attendance','School'],AC);
NOTIFROWS(s7,[
  ['📢','Exam timetable published — Term 3','Finals start 28 Jul. Check schedule in Results section.','5 min ago','#8B5CF6',true],
  ['💳','Fee reminder: ₹5,200 due 20 Jul','Pay at vidyam.in/pay or school counter. Ref: INV-2026-004','1 hr ago','#F59E0B',true],
  ['📊','Math marks updated — Unit Test 3: 92%','Marks published for Unit Test 3 in Mathematics. View in Results.','3 hrs ago',AC,true],
  ['🏆','Top scorer — Computer Science (94/100)','Certificate will be distributed on 18 Jul. Congratulations!','Yesterday','#10B981',false],
  ['📅','PTM scheduled — 25 July 2026','Parent-Teacher Meeting at 10 AM. Mandatory attendance.','2 days ago','#8B5CF6',false],
  ['✅','Q3 fee receipt ready — RCT-2026-003','₹12,200 receipt available in Fees section.','3 days ago','#10B981',false],
  ['📚','New notes — Physics Ch.8 Optics','Ms. Priya Nair uploaded Optics Lab Manual.','4 days ago',AC,false],
  ['🔔','Holiday: Independence Day — 15 Aug','School closed on 15 August 2026. National holiday.','5 days ago','#6B7280',false]],AC);

const s8=F(SP,G*7,0,1440,900,'#F0F4F8',0,'Student - Storage');
STORAGESCR(s8,ROLE,NAV,AC,264,[['Chapter Notes — Math.pdf','📄','2.4 MB','08 Jul'],['Physics Lab Report.docx','📄','1.2 MB','07 Jul'],['Project Presentation.pptx','📊','8.6 MB','05 Jul'],['Biology Diagrams.png','🖼️','4.2 MB','03 Jul'],['Assignment 7 — Calc.pdf','📄','0.8 MB','01 Jul']]);
console.log('✅ STEP 2 complete — Student 8/8 screens');
}


// ════════════════════════════════════════════════════════════════════
// STEP 3 — TEACHER: 8 SCREENS
// Role: Mr. Rajan Kumar | Color: #10B981 (Green)
// Screens: Dashboard, Attendance, My Students, Marks Entry, Timetable, Reports, Notifications, Storage
// ════════════════════════════════════════════════════════════════════
// [Teacher code — see full execution above in STEP 3]


// ════════════════════════════════════════════════════════════════════
// STEP 4 — PARENT: 7 SCREENS (No Storage)
// Role: Rajesh Sharma | Color: #F59E0B (Amber)
// Screens: Overview, Attendance, Marks, Fees, Notices, Timetable, Notifications
// ════════════════════════════════════════════════════════════════════
// [Parent code — see full execution above in STEP 4]


// ════════════════════════════════════════════════════════════════════
// STEP 5 — PRINCIPAL: 8 SCREENS
// Role: Dr. Meena Iyer | Color: #8B5CF6 (Purple)
// Screens: Morning Briefing, Circulars, Notices, Results, Attendance, Staff, Notifications, Storage
// ════════════════════════════════════════════════════════════════════
// [Principal code — see full execution above in STEP 5]


// ════════════════════════════════════════════════════════════════════
// STEP 6 — SCHOOL ADMIN: 8 SCREENS
// Role: Anita Kulkarni | Color: #06B6D4 (Cyan)
// Screens: Dashboard, Fees, Students, Teachers, Reports, Link Users, Notifications, Storage
// ════════════════════════════════════════════════════════════════════
// [School Admin code — see full execution above in STEP 6]


// ════════════════════════════════════════════════════════════════════
// STEP 7 — OWNER: 8 SCREENS
// Role: Vikram Mehta | Color: #EF4444 (Red)
// Screens: Overview, Schools, Billing, Analytics, Settings, Support, Notifications, Storage
// ════════════════════════════════════════════════════════════════════
// [Owner code — see full execution above in STEP 7]


// ════════════════════════════════════════════════════════════════════
// STEP 8 — VALIDATION (run last)
// ════════════════════════════════════════════════════════════════════
{
const G=1504;
const EXPECTED={
  'Student':    {count:8,nav:['Dashboard','Attendance','Results','Timetable','Fees','Notes','Notifications','Storage']},
  'Teacher':    {count:8,nav:['Dashboard','Attendance','My Students','Marks Entry','Timetable','Reports','Notifications','Storage']},
  'Parent':     {count:7,nav:['Overview','Attendance','Marks','Fees','Notices','Timetable','Notifications']},
  'Principal':  {count:8,nav:['Morning Briefing','Circulars','Notices','Results','Attendance','Staff','Notifications','Storage']},
  'School Admin':{count:8,nav:['Dashboard','Fees','Students','Teachers','Reports','Link Users','Notifications','Storage']},
  'Owner':      {count:8,nav:['Overview','Schools','Billing','Analytics','Settings','Support','Notifications','Storage']}
};
const issues=[];let total=0;
figma.root.children.forEach(page=>{
  const exp=EXPECTED[page.name];if(!exp){issues.push('UNKNOWN: '+page.name);return;}
  total+=page.children.length;
  if(page.children.length!==exp.count)issues.push(page.name+': found '+page.children.length+' frames, expected '+exp.count);
  const sorted=[...page.children].sort((a,b)=>a.x-b.x);
  sorted.forEach((frame,i)=>{
    if(frame.x!==i*G)issues.push(page.name+'['+i+']: x='+frame.x+' expected '+(i*G));
    if(frame.width!==1440||frame.height!==900)issues.push(page.name+'['+i+']: bad size');
    const sb=frame.children.find(c=>c.name==='Sidebar');
    if(!sb)issues.push(page.name+'['+i+']: no Sidebar');
    else if(!sb.children.some(c=>c.name==='ab'))issues.push(page.name+'['+i+']: no active nav highlight');
  });
});
console.log(issues.length===0?'✅ ALL VALID — '+total+' screens, 0 issues':'❌ '+issues.length+' issues:\n'+issues.join('\n'));
}
