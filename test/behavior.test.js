import test from "node:test";
import assert from "node:assert/strict";
import { computeBehavior } from "../src/behavior.js";
test("counts frustration signals without code false positives",()=>{const x=computeBehavior("NOOO!!! you forgot, damn it");assert.equal(x.words,5);assert.ok(x.anguish>=1);assert.equal(x.profanity,1);assert.equal(x.negation,0);assert.equal(x.blame,1);const clean=computeBehavior("```NOOO!!!``` https://example.com > damn");assert.equal(clean.profanity,0);assert.equal(clean.anguish,0)});
