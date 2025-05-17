import { replaceAt, replaceAll } from '../src/hooks/noteViewerHooks';
import assert from 'assert';

// Test replaceAt
const content = 'hello world';
const replaced = replaceAt(content, 6, 5, 'universe');
assert.strictEqual(replaced, 'hello universe');

// Test replaceAll case insensitive
const multi = 'one ONE One';
const result1 = replaceAll(multi, 'one', { caseSensitive: false, wholeWord: false }, 'two');
assert.strictEqual(result1, 'two two two');

// Test replaceAll whole word
const words = 'testing testers test';
const result2 = replaceAll(words, 'test', { caseSensitive: true, wholeWord: true }, 'exam');
assert.strictEqual(result2, 'exam testers exam');

console.log('All tests passed');
