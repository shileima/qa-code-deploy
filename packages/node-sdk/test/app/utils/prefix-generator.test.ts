import * as assert from 'assert';
import { generatePrefix, validatePrefix, generateUniquePrefix } from '../../../app/utils/prefix-generator';

describe('test/app/utils/prefix-generator.test.ts', () => {
  it('should generate prefix with default length', () => {
    const prefix = generatePrefix();
    assert(prefix.length === 16);
    assert(/^[a-z0-9]+$/.test(prefix));
  });

  it('should generate prefix with custom length', () => {
    const prefix = generatePrefix(8);
    assert(prefix.length === 8);
    assert(/^[a-z0-9]+$/.test(prefix));
  });

  it('should validate valid prefix', () => {
    assert(validatePrefix('test1234') === true);
    assert(validatePrefix('abcdefgh') === true);
    assert(validatePrefix('12345678') === true);
    assert(validatePrefix('a1b2c3d4e5f6g7h8') === true);
  });

  it('should reject invalid prefix', () => {
    assert(validatePrefix('test') === false); // 太短
    assert(validatePrefix('TEST1234') === false); // 大写字母
    assert(validatePrefix('test-123') === false); // 特殊字符
    assert(validatePrefix('test_123') === false); // 下划线
    assert(validatePrefix('test 123') === false); // 空格
  });

  it('should generate unique prefix', () => {
    const existing = ['prefix1', 'prefix2', 'prefix3'];
    const prefix = generateUniquePrefix(8, existing);
    
    assert(prefix.length === 8);
    assert(!existing.includes(prefix));
    assert(validatePrefix(prefix) === true);
  });

  it('should generate unique prefix with many existing', () => {
    const existing = Array.from({ length: 100 }, (_, i) => `prefix${i}`);
    const prefix = generateUniquePrefix(8, existing);
    
    assert(prefix.length === 8);
    assert(!existing.includes(prefix));
    assert(validatePrefix(prefix) === true);
  });
});