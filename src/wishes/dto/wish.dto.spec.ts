import { plainToInstance } from 'class-transformer'
import { validate } from 'class-validator'
import { CreateWishDto } from './wish.dto'

const input = {
  title: 'Legal support',
  description: 'A sufficiently long description',
}

describe('CreateWishDto category', () => {
  it.each([[['Health']], [['Legal aid', 'Training']], [['صحة']], [['دعم قانوني', 'تدريب']]])(
    'accepts %j',
    async (category) => {
      const dto = plainToInstance(CreateWishDto, { ...input, category })
      expect(await validate(dto)).toHaveLength(0)
    },
  )

  it('normalizes whitespace', async () => {
    const dto = plainToInstance(CreateWishDto, { ...input, category: ['  Legal   aid  '] })
    expect(await validate(dto)).toHaveLength(0)
    expect(dto.category).toEqual(['Legal aid'])
  })

  it.each([
    [[]],
    [['one two three']],
    [['Legal · aid']],
    [['#health']],
    [['one', 'two', 'three']],
    ['Health'],
  ])('rejects %j', async (category) => {
    const dto = plainToInstance(CreateWishDto, { ...input, category })
    expect(await validate(dto)).not.toHaveLength(0)
  })
})
