import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
test('Postgres enforces membership, owner isolation and private immutable media',async()=>{
  const db=new PGlite();
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
    await db.exec(await fs.readFile(new URL('../supabase/migrations/202611120001_mobile_lectures.sql',import.meta.url),'utf8'));
    const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222',hash='a'.repeat(64);
    await db.exec(`insert into auth.users values ('${a}'),('${b}');insert into public.mobile_members(email) values('a@example.test');`);
    const login=async(uid,email)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false),set_config('request.jwt.claim.email',$2,false)",[uid,email]);await db.exec('set role authenticated');};
    await login(a,'a@example.test');
    await db.query('insert into mobile_lectures(owner_id,fingerprint,lesson_id,title,case_count,manifest) values($1,$2,$3,$4,1,$5)',[a,hash,'test','Test',JSON.stringify({fingerprint:hash})]);
    await db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['lecture-media',`${a}/${hash}/media/${hash}`]);
    assert.equal((await db.query('select * from mobile_lectures')).rows.length,1);
    await db.query('update mobile_lectures set audio=$1 where fingerprint=$2',[JSON.stringify({sha256:hash}),hash]);
    const publish=()=>db.query("update mobile_lectures set timing='{\"version\":2}' where fingerprint=$1 and audio->>'sha256'=$2 and timing is null returning fingerprint",[hash,hash]);
    assert.equal((await publish()).rows.length,1);assert.equal((await publish()).rows.length,0,'published/manual timing cannot be overwritten');
    await db.query('update mobile_lectures set timing=null,audio=$1',[JSON.stringify({sha256:'b'.repeat(64)})]);assert.equal((await publish()).rows.length,0,'changed recording cannot receive stale timing');
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['lecture-media',`${b}/${hash}/media/${hash}`]),/row-level/);
    assert.equal((await db.query("update storage.objects set name='overwritten' returning *")).rows.length,0);
    await assert.rejects(db.query("insert into mobile_members values('intruder@example.test',now())"),/permission denied/);
    await login(b,'b@example.test');assert.equal((await db.query('select * from mobile_lectures')).rows.length,0);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await assert.rejects(db.query('insert into storage.objects(bucket_id,name) values($1,$2)',['lecture-media',`${b}/own-file`]),/row-level/);
    await db.exec('reset role; set role anon');await assert.rejects(db.query('select * from mobile_lectures'),/permission denied/);assert.equal((await db.query('select * from storage.objects')).rows.length,0);
    await db.exec('reset role');assert.equal((await db.query("select public from storage.buckets where id='lecture-media'")).rows[0].public,false);
  }finally{await db.close();}
});
