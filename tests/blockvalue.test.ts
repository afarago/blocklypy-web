import { BlockValue, num_eval } from '../src/pyconverter/blockvalue';

describe('testing BlockValue file', () => {
  test('numeric raw should stay numeric', () => {
    expect(new BlockValue(42).raw).toBe(42);
  });
  test('string raw should get quoted', () => {
    expect(new BlockValue('42', undefined, undefined, true).raw).toBe('"42"');
  });
  test('simple num_eval #1', () => {
    expect(num_eval(41, '+', 1).raw).toBe(42);
  });
  test('complex num_eval of a local numbers', () => {
    expect(num_eval([2, '*', [41, '+', ['-', 1]]]).raw).toBe(80);
  });
  test('num_eval of two local numbers should result in a number', () => {
    expect(
      BlockValue.is_dynamic(
        num_eval(new BlockValue(41), '+', new BlockValue(1))
      ).raw
    ).toBeFalsy();
  });
  test('num_eval of a dynamic element + number should result in a dynamic', () => {
    expect(
      BlockValue.is_dynamic(
        num_eval(new BlockValue('None', true), '+', new BlockValue(1))
      )
    ).toBeTruthy();
  });
});
