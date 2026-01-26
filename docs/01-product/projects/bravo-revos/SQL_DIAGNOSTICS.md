# SQL Diagnostics for Supabase Migration Issues

## Test 1: Basic Comment Syntax (Copy This First)

```sql
-- Test comment line 1
-- Test comment line 2
SELECT 1 as test;
```

**Expected**: Should return `1`
**If it fails**: Comments are broken

---

## Test 2: Comment with "function" keyword

```sql
-- This comment mentions function keyword
SELECT 2 as test;
```

**Expected**: Should return `2`
**If it fails**: Keyword in comment triggers parser

---

## Test 3: Multi-line comment

```sql
/*
  This is a multi-line comment
  That mentions function keyword
*/
SELECT 3 as test;
```

**Expected**: Should return `3`
**If it fails**: Try `/* */` style instead

---

## Test 4: DO Block Basic Syntax

```sql
DO $$
BEGIN
  RAISE NOTICE 'DO block works';
END $$;
```

**Expected**: Should execute without error
**If it fails**: DO blocks aren't supported or $$ syntax is wrong

---

## Test 5: DO Block with IF NOT EXISTS

```sql
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'test_idx_that_doesnt_exist') THEN
    RAISE NOTICE 'Index does not exist';
  END IF;
END $$;
```

**Expected**: Should print notice
**If it fails**: IF NOT EXISTS check logic is broken

---

## Test 6: String Escaping

```sql
SELECT 'Here''s a test with apostrophe' as test;
```

**Expected**: Should return the string
**If it fails**: String escaping is wrong

---

## Test 7: Template Syntax

```sql
SELECT '{{placeholder_value}}' as test;
```

**Expected**: Should return the string literally
**If it fails**: Template syntax conflicts with PostgreSQL

---

## Instructions

1. Copy **ONE test at a time** to Supabase SQL editor
2. Run it
3. Report back which test number FAILS first
4. This will tell us exactly what's broken
