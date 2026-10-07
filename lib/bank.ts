import {z} from 'zod';
import {all,first,run,database} from './database';
import {now} from './domain';
import {hash,HttpError} from './auth';
const amount=z.number().int().min(1).max(1000000000000),text=z.string().trim().min(1).max(200),date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const bankImportSchema=z.object({sourceUrl:z.string().url().max(250).refine(v=>/^https:\/\/docs\.google\.com\/spreadsheets\/d\/[A-Za-z0-9_-]+\/edit$/.test(v)),sourceTitle:text,issues:z.array(z.string().max(300)).max(10),roster:z.array(z.object({row:z.number().int(),name:z.string().min(1).max(80),class:z.enum(['Warrior','Ninja','Sura','Shaman','Lycan']),yang:z.number().int().min(0).max(1000000000000),active:z.boolean()})).max(300),deposits:z.array(z.object({row:z.number().int(),date,name:text,amount,description:z.string().max(300)})).max(2000),expenses:z.array(z.object({row:z.number().int(),date,description:text,amount:z.number().int().min(-1000000000000).max(1000000000000).refine(n=>n!==0),loanKey:z.string().max(200).optional()})).max(500),loans:z.array(z.object({key:text,borrower:text,description:text,principal:amount,repaid:z.number().int().min(0),date,rows:z.array(z.number().int()).max(100)})).max(100)});
export async function importBank(raw:unknown,actor:string){
 const data=bankImportSchema.parse(raw);
 const batch=await hash(JSON.stringify(data));const old=await first<any>("SELECT batch FROM bank_source WHERE key='guild-bank'");if(old?.batch===batch)return {imported:false};if(old)throw new HttpError(409,'A guild bank snapshot already exists. Reconcile subsequent changes before replacing it.');
 const sumDeposits=data.deposits.reduce((s,d)=>s+d.amount,0),sumMembers=data.roster.reduce((s,p)=>s+p.yang,0);if(sumMembers!==sumDeposits)throw new HttpError(400,'Member totals and deposit records do not reconcile.');
 const today=new Date(Date.now()+3*3600000).toISOString().slice(0,10),loanIds=new Map<string,string>();const statements:D1PreparedStatement[]=[];
 for(const loan of data.loans){if(loan.repaid>loan.principal)throw new HttpError(400,'Loan repayments exceed the original loan.');const sourceRows=data.expenses.filter(e=>e.loanKey===loan.key);if(sourceRows.reduce((s,e)=>s+Math.max(0,e.amount),0)!==loan.principal||sourceRows.reduce((s,e)=>s-Math.min(0,e.amount),0)!==loan.repaid)throw new HttpError(400,'Loan history does not reconcile.');const key=batch+':loan:'+await hash(loan.key);loanIds.set(loan.key,key);statements.push(database().prepare('INSERT OR IGNORE INTO guild_loans(id,batch,borrower,principal,repaid,description,issued,created,created_by) VALUES(?,?,?,?,?,?,?,?,?)').bind(key,batch,loan.borrower,loan.principal,loan.repaid,loan.description,loan.date,now(),actor));}
 for(const person of data.roster)statements.push(database().prepare('INSERT OR IGNORE INTO bank_people(id,batch,name,class,yang,active) VALUES(?,?,?,?,?,?)').bind(batch+':person:'+person.row,batch,person.name,person.class,person.yang,person.active?1:0));
 for(const dep of data.deposits)statements.push(database().prepare("INSERT OR IGNORE INTO bank_entries(id,batch,kind,status,name,amount,date,description,source_row,source_tab,created_by) VALUES(?,?,'deposit','recorded',?,?,?,?,?,'Deposit_Log',?)").bind(batch+':deposit:'+dep.row,batch,dep.name,dep.amount,dep.date,dep.description||'Guild Deposit',dep.row,actor));
 for(const e of data.expenses){if(e.loanKey&&!loanIds.has(e.loanKey))throw new HttpError(400,'An expense references an unknown loan.');const loan=e.loanKey?loanIds.get(e.loanKey):null;const borrower=e.loanKey?data.loans.find(l=>l.key===e.loanKey)?.borrower:'Guild';const kind=e.loanKey?(e.amount>0?'loan':'repayment'):'expense';statements.push(database().prepare('INSERT OR IGNORE INTO bank_entries(id,batch,kind,status,name,amount,date,description,source_row,source_tab,loan_id,created_by) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(batch+':expense:'+e.row,batch,kind,e.date>today&&kind==='expense'?'planned':'recorded',borrower||'Guild',-e.amount,e.date,e.description,e.row,'Expenses_Log',loan||null,actor));}
 // Staged rows are invisible until the source pointer is activated. Retry safely resumes the same batch.
 for(let i=0;i<statements.length;i+=40)await database().batch(statements.slice(i,i+40));
 await run("INSERT OR IGNORE INTO bank_source(key,batch,url,title,issues,imported,imported_by) VALUES('guild-bank',?,?,?,?,?,?)",batch,data.sourceUrl,data.sourceTitle,JSON.stringify(data.issues),now(),actor);
 const activated=await first<any>("SELECT batch FROM bank_source WHERE key='guild-bank'");if(activated?.batch!==batch)throw new HttpError(409,'Another bank snapshot was imported. Reconcile the records before replacing it.');
 return {imported:true,members:data.roster.length,deposits:data.deposits.length,loans:data.loans.length};
}
export async function readBank(admin:boolean){
 const source=await first<any>("SELECT * FROM bank_source WHERE key='guild-bank'");const batch=source?.batch||'';
 const [people,entries,loans,approved,totals]=await Promise.all([
  all<any>('SELECT id,name,class,yang total_yang,active FROM bank_people WHERE batch=? ORDER BY name',batch),
  all<any>('SELECT id,kind,status,name,amount,date,description,loan_id FROM bank_entries WHERE batch=? OR batch IS NULL ORDER BY date DESC,id DESC LIMIT 2500',batch),
  all<any>('SELECT id,borrower,principal,repaid,description,issued,due FROM guild_loans WHERE batch=? OR batch IS NULL ORDER BY issued DESC,id DESC LIMIT 200',batch),
  all<any>("SELECT d.id,d.yang amount,COALESCE(d.reviewed,d.created) reviewed,m.name,d.note FROM deposits d JOIN members m ON m.id=d.member_id WHERE d.status='approved' AND COALESCE(d.reviewed,d.created)>=? ORDER BY d.reviewed DESC LIMIT 2000",source?.imported||0),
  first<any>("SELECT COALESCE(SUM(CASE WHEN status='recorded' THEN amount ELSE 0 END),0) cash,COALESCE(SUM(CASE WHEN status='planned' THEN -amount ELSE 0 END),0) planned,COALESCE(SUM(CASE WHEN kind='deposit' THEN amount ELSE 0 END),0) deposited FROM bank_entries WHERE batch=? OR batch IS NULL",batch)
 ]);
 const approvedTotal=await first<any>("SELECT COALESCE(SUM(yang),0) amount FROM deposits WHERE status='approved' AND COALESCE(reviewed,created)>=?",source?.imported||0);
 const outstanding=await first<any>('SELECT COALESCE(SUM(principal-repaid),0) amount FROM guild_loans WHERE batch=? OR batch IS NULL',batch);
 const cash=totals.cash+approvedTotal.amount,planned=totals.planned;
 const paymentEntries=approved.map(d=>({id:'app:'+d.id,kind:'deposit',status:'recorded',name:d.name,amount:d.amount,date:new Date((d.reviewed+3*3600)*1000).toISOString().slice(0,10),description:d.note||'Guild Deposit',loan_id:null}));
 return {source:source?{title:source.title,url:source.url,imported:source.imported,issues:admin?JSON.parse(source.issues):[]}:null,people,entries:[...entries,...paymentEntries].sort((a,b)=>b.date.localeCompare(a.date)),loans,summary:{deposited:totals.deposited+approvedTotal.amount,cash,planned,available:cash-planned,outstanding:outstanding.amount}};
}
export async function createLoan(input:{id:string;borrower:string;principal:number;description:string;issued:string;due:string|null},actor:string){
 const previous=await first<any>('SELECT * FROM guild_loans WHERE id=?',input.id);if(previous){if(previous.principal!==input.principal||previous.borrower!==input.borrower||previous.description!==input.description||previous.issued!==input.issued||previous.due!==input.due)throw new HttpError(409,'This request ID was already used.');return;}
 const bank=await readBank(true);if(input.principal>bank.summary.available)throw new HttpError(409,'The loan exceeds the available guild bank balance.');
 // The insert reserves the available balance within the same D1 transaction as its bank entry.
 const r=await database().batch([
  database().prepare("INSERT INTO guild_loans(id,borrower,principal,description,issued,due,created,created_by) SELECT ?,?,?,?,?,?,?,? WHERE (SELECT COALESCE(SUM(amount),0) FROM bank_entries WHERE batch=(SELECT batch FROM bank_source WHERE key='guild-bank') OR batch IS NULL)+(SELECT COALESCE(SUM(yang),0) FROM deposits WHERE status='approved' AND COALESCE(reviewed,created)>=COALESCE((SELECT imported FROM bank_source WHERE key='guild-bank'),?))>= ?").bind(input.id,input.borrower,input.principal,input.description,input.issued,input.due,now(),actor,0,input.principal),
  database().prepare("INSERT INTO bank_entries(id,kind,status,name,amount,date,description,loan_id,created_by) SELECT ?,'loan','recorded',borrower,-principal,issued,description,id,? FROM guild_loans WHERE id=?").bind('loan:'+input.id,actor,input.id)
 ]);if(!r[0].meta.changes)throw new HttpError(409,'This loan could not be created.');
}
export async function repayLoan(input:{id:string;loanId:string;amount:number;date:string},actor:string){
 const old=await first<any>('SELECT loan_id,amount,date FROM bank_entries WHERE id=?',input.id);if(old){if(old.loan_id!==input.loanId||old.amount!==input.amount||old.date!==input.date)throw new HttpError(409,'This request ID was already used.');return;}
 const r=await database().batch([
  database().prepare("INSERT INTO bank_entries(id,kind,status,name,amount,date,description,loan_id,created_by) SELECT ?,'repayment','recorded',borrower,?,?,'Loan Repayment',id,? FROM guild_loans WHERE id=? AND (batch IS NULL OR batch=(SELECT batch FROM bank_source WHERE key='guild-bank')) AND principal-repaid>=?").bind(input.id,input.amount,input.date,actor,input.loanId,input.amount),
  database().prepare('UPDATE guild_loans SET repaid=repaid+? WHERE id=? AND EXISTS(SELECT 1 FROM bank_entries WHERE id=? AND loan_id=?)').bind(input.amount,input.loanId,input.id,input.loanId)
 ]);if(!r[0].meta.changes)throw new HttpError(409,'The repayment exceeds the remaining loan balance.');
}
