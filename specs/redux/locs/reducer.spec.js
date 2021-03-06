import { locs as reducer, loc } from '../../../src/redux/locs/'
import { LOCS_LIST, LOC_CREATE, LOC_UPDATE, LOC_REMOVE } from '../../../src/redux/locs/list/reducer'
import { LOC_FORM_SUBMIT_START, LOC_FORM_SUBMIT_END } from '../../../src/redux/locs/locForm/reducer'
import LOCModel from '../../../src/models/LOCModel'

describe('LOCs reducer', () => {
  let address = '0x100500'
  let state = reducer(undefined, {})

  it('create empty state', () => {
    expect(state.toObject()).toEqual({})
  })

  it('Add new LOC with default fields', () => {
    let action = {type: LOC_CREATE, data: new LOCModel({address})}
    state = reducer(state, action)
    expect(state.get(address).get('address')).toEqual(address)
  })

  it('Change name of the LOC', () => {
    let valueName = 'locName'
    let value = 'test name'
    state = reducer(state, {type: LOC_UPDATE, data: {valueName, value, address}})
    expect(state.get(address).get('locName')).toEqual(value)
  })

  it('State should not be changed', () => {
    let action = {type: 'SOME_TYPE'}
    expect(reducer(state, action)).toEqual(state)
  })

  it('Remove LOC. State should be empty', () => {
    state = reducer(state, {type: LOC_REMOVE, data: {address}})
    expect(state.toObject()).toEqual({})
  })

  it('Set state Completely', () => {
    state = reducer(state, {type: LOCS_LIST, data: {x: 1}})
    expect(state).toEqual({x: 1})
  })

  it('Start form submitting', () => {
    state = loc(undefined, {type: LOC_FORM_SUBMIT_START})
    expect(state.isSubmitting()).toBe(true)
  })

  it('End form submitting', () => {
    state = loc(undefined, {type: LOC_FORM_SUBMIT_END})
    expect(state.isSubmitting()).toBe(false)
  })
})
