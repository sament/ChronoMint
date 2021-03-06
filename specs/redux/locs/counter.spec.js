import { LOCS_COUNTER } from '../../../src/redux/locs/counter'
import { counter as reducer } from '../../../src/redux/locs/'

describe('LOCs counter', () => {
  it('should return initial state', () => {
    expect(reducer(undefined, {}))
      .toEqual(0)
  })

  it('should handle LOCS_COUNTER', () => {
    expect(reducer({}, {type: LOCS_COUNTER, payload: 5}))
      .toEqual(5)
  })
})
