import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';

test('shared libraries isolate learner state, enforce read-only content and follow current/future teaching',async()=>{
  const db=new PGlite(),a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',c='33333333-3333-4333-8333-333333333333';
  const fp='a'.repeat(64),fp2='b'.repeat(64),fp3='c'.repeat(64),fp4='d'.repeat(64),image='1'.repeat(64),audio='2'.repeat(64),replacement='3'.repeat(64);
  try{
    await db.exec(`create role anon; create role authenticated; create schema auth; create schema storage;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select jsonb_build_object('email',current_setting('request.jwt.claim.email',true)) $$;
      create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
      create table storage.objects(id serial primary key,bucket_id text,name text);
      alter table storage.objects enable row level security;
      create function storage.foldername(name text) returns text[] language sql immutable as $$ select string_to_array(name,'/') $$;
      grant usage on schema public,auth,storage to anon,authenticated;
      grant select,insert,update,delete on storage.objects to anon,authenticated;
      grant usage,select on sequence storage.objects_id_seq to anon,authenticated;`);
    for(const name of ['202611120001_mobile_lectures.sql','202611120002_card_choices.sql','202611120003_shared_libraries.sql'])await db.exec(await fs.readFile(new URL('../supabase/migrations/'+name,import.meta.url),'utf8'));
    await db.query('insert into auth.users values($1),($2),($3)',[a,b,c]);
    await db.exec("insert into mobile_members(email) values('a@example.test'),('b@example.test'),('c@example.test')");
    const login=async(uid)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.email',$2,false)",[uid,uid===a?'a@example.test':uid===b?'b@example.test':'c@example.test']);await db.exec('set role authenticated');};
    const add=async(uid,fingerprint,title='Shared teaching')=>db.query('insert into mobile_lectures(owner_id,fingerprint,lesson_id,title,case_count,manifest,audio) values($1,$2,$3,$4,1,$5,$6)',[uid,fingerprint,'lesson',title,JSON.stringify({fingerprint,media:[{path:`media/${image}`}],cardReview:{privateOwnerObjective:'never share this'}}),JSON.stringify({path:`audio/${audio}`,sha256:audio})]);
    const row=async(uid,fingerprint=fp)=>(await db.query('select * from mobile_lectures where owner_id=$1 and fingerprint=$2',[uid,fingerprint])).rows[0];
    const choices=(id,objective)=>({version:1,channel:`mobile-${id}`,review:{lessonId:'lesson',images:{image:{decision:'cards',objective,role:'normal'}},manualGroups:[]},desktopBase:{lessonId:'lesson'}});
    await login(a);await add(a,fp);await add(a,fp2);
    await db.query('update mobile_lectures set card_choices=$1,card_revision=1 where fingerprint=$2',[JSON.stringify(choices(a,'Owner only')),fp]);
    await db.query('insert into mobile_progress(owner_id,fingerprint,position) values($1,$2,120)',[a,fp]);
    for(const hash of [fp,fp2])for(const part of [`media/${image}`,`audio/${audio}`,`audio/${replacement}`])await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['lecture-media',`${a}/${hash}/${part}`]);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['lecture-media',`${a}/unpublished/private`]);
    const original=await row(a);
    await login(b);assert.equal((await db.query('select * from mobile_lectures')).rows.length,0);
    await db.exec('reset role');await db.query('insert into mobile_library_shares(owner_id,recipient_id) values($1,$2)',[a,b]);
    await login(b);
    assert.equal((await db.query('select * from mobile_lectures')).rows.length,2);
    const shared=await row(b);assert.equal(shared.shared_from_owner_id,a);assert.equal(shared.card_choices,null);assert.equal(shared.card_revision,0);
    assert.equal(shared.manifest.cardReview,undefined);assert.deepEqual(shared.manifest.media,original.manifest.media);
    assert.equal((await db.query('select * from mobile_progress')).rows.length,0,'owner bookmark never copied');
    assert.equal(await row(a),undefined,'owner private choices never readable');
    assert.equal((await db.query('select * from storage.objects')).rows.length,4,'only current registered media, not old exports or unrelated files');

    const rafaChoices=choices(b,'Reader only');
    const save=()=>db.query('update mobile_lectures set card_choices=$1,card_revision=1 where fingerprint=$2 and card_revision=0 returning card_revision',[JSON.stringify(rafaChoices),fp]);
    assert.equal((await save()).rows[0].card_revision,1);assert.equal((await save()).rows.length,0,'independent CAS state');
    await db.query('insert into mobile_progress(owner_id,fingerprint,position,updated_at) values($1,$2,33,$3)',[b,fp,'2026-11-12T00:00:00Z']);
    for(const update of ["title='changed'","manifest='{}'::jsonb","audio=null","timing='{}'::jsonb",'shared_from_owner_id=null',`owner_id='${a}'`,`fingerprint='${fp3}'`])await assert.rejects(db.exec(`update mobile_lectures set ${update} where fingerprint='${fp}'`),/read-only|ownership|row-level/);
    await assert.rejects(db.query('insert into mobile_lectures(owner_id,fingerprint,lesson_id,title,case_count,manifest,shared_from_owner_id) values($1,$2,$3,$4,1,$5,$6)',[b,fp3,'lesson','Forged',JSON.stringify({fingerprint:fp3}),a]),/administrator/);
    await assert.rejects(db.query('insert into mobile_library_shares(owner_id,recipient_id) values($1,$2)',[a,c]),/permission denied/);
    await assert.rejects(db.exec(`select mobile_copy_shared_lecture(l,'${c}') from mobile_lectures l`),/permission denied/);
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['lecture-media',`${a}/${fp}/media/${replacement}`]),/row-level/);
    assert.equal((await db.exec("update storage.objects set name='tampered' returning *"))[0].rows.length,0);

    await login(a);assert.deepEqual(await row(a),original,'recipient changes leave every original field intact');
    assert.equal((await db.query('select position from mobile_progress')).rows[0].position,120);
    await db.query('update mobile_lectures set audio=$1,timing=$2,title=$3 where fingerprint=$4',[JSON.stringify({path:`audio/${replacement}`,sha256:replacement}),JSON.stringify({version:2}),'Updated teaching',fp]);
    await add(a,fp3,'New automatic lecture');
    await login(b);assert.equal((await db.query('select * from mobile_lectures')).rows.length,3,'future lectures arrive automatically');
    const synced=await row(b);assert.equal(synced.audio.sha256,replacement);assert.equal(synced.title,'Updated teaching');assert.deepEqual(synced.card_choices,rafaChoices);assert.equal(synced.card_revision,1);
    assert.equal((await db.query('select position from mobile_progress')).rows[0].position,33,'content updates preserve reader bookmark');
    const visible=(await db.query('select name from storage.objects')).rows.map(r=>r.name);
    assert.ok(visible.includes(`${a}/${fp}/audio/${replacement}`));assert.ok(!visible.includes(`${a}/${fp}/audio/${audio}`),'superseded recordings are not exposed');

    await add(b,fp4,'Independent reader upload');
    await login(a);await add(a,fp4,'Owner upload with same fingerprint');
    await login(b);assert.equal((await row(b,fp4)).title,'Independent reader upload');assert.equal((await row(b,fp4)).shared_from_owner_id,null);
    await login(c);assert.equal((await db.query('select * from mobile_lectures')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await db.exec('reset role');await db.query('insert into mobile_library_shares(owner_id,recipient_id) values($1,$2)',[b,c]);
    await login(c);assert.equal((await db.query('select * from mobile_lectures')).rows.length,1,'sharing cannot redistribute lectures received from someone else');

    await db.exec('reset role');await db.query('delete from mobile_library_shares where owner_id=$1 and recipient_id=$2',[a,b]);
    await login(b);assert.equal((await db.query('select * from mobile_lectures')).rows.length,1,'revocation hides shared content');assert.equal((await db.query('select * from storage.objects')).rows.length,0,'revocation stops new media access');
    assert.equal((await db.query('update mobile_lectures set card_revision=2 where fingerprint=$1 returning *',[fp])).rows.length,0);
    await db.exec('reset role');await db.query('insert into mobile_library_shares(owner_id,recipient_id) values($1,$2)',[a,b]);
    await login(b);assert.deepEqual((await row(b)).card_choices,rafaChoices);assert.equal((await db.query('select position from mobile_progress')).rows[0].position,33,'regrant preserves saved learner work');
    await db.exec('reset role; set role anon');await assert.rejects(db.query('select * from mobile_library_shares'),/permission denied/);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
  }finally{await db.close();}
});
