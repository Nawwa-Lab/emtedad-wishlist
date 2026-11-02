import { normalizeTitle } from './normalize-title'
describe('normalizeTitle', () => {
  it('normalizes unicode, whitespace, and case', () => {
    expect(normalizeTitle('  Legal   AID  ')).toBe('legal aid')
    expect(normalizeTitle('ＡＢＣ')).toBe('abc')
  })
})
