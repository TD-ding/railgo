import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validatePhone,
  validateOtp,
  validateName,
  validateIdNo,
} from "../src/lib/validation";

test("validatePhone accepts a valid CN mobile and rejects bad input", () => {
  assert.equal(validatePhone("13800000000"), null);
  assert.equal(validatePhone("18612345678"), null);
  assert.ok(validatePhone(""));
  assert.ok(validatePhone("12345"));
  assert.ok(validatePhone("23800000000")); // must start with 1
  assert.ok(validatePhone("1380000000")); // 10 digits
});

test("validateOtp requires exactly 6 digits", () => {
  assert.equal(validateOtp("123456"), null);
  assert.ok(validateOtp("12345"));
  assert.ok(validateOtp("1234567"));
  assert.ok(validateOtp("abcdef"));
  assert.ok(validateOtp(""));
});

test("validateName accepts CJK and latin names, rejects junk", () => {
  assert.equal(validateName("张伟"), null);
  assert.equal(validateName("李 娜"), null);
  assert.equal(validateName("Li Na"), null);
  assert.equal(validateName("阿凡提·买买提"), null);
  assert.ok(validateName(""));
  assert.ok(validateName("王")); // too short
  assert.ok(validateName("张3伟")); // digits not allowed
});

test("validateIdNo verifies the resident-ID checksum", () => {
  // Known-good 18-digit IDs with correct check digit.
  assert.equal(validateIdNo("110101199003071233", "id"), null);
  assert.equal(validateIdNo("440301199511203455", "id"), null);
  // Flip the check digit -> should fail.
  assert.ok(validateIdNo("110101199003071231", "id"));
  // Wrong length.
  assert.ok(validateIdNo("12345", "id"));
  // Impossible birth month.
  assert.ok(validateIdNo("110101199013071230", "id"));
});

test("validateIdNo handles passports", () => {
  assert.equal(validateIdNo("E12345678", "passport"), null);
  assert.equal(validateIdNo("G1234567", "passport"), null);
  assert.ok(validateIdNo("AB", "passport")); // too short
  assert.ok(validateIdNo("E1234567!", "passport")); // bad char
});

test("validateIdNo infers type when not given", () => {
  // 18-char with valid checksum -> treated as resident ID.
  assert.equal(validateIdNo("110101199003071233"), null);
  // Short alnum -> treated as passport.
  assert.equal(validateIdNo("E12345678"), null);
});
