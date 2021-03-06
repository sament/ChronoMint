import RewardsDAO from '../../dao/RewardsDAO'
import LHTProxyDAO from '../../dao/LHTProxyDAO'
import LS from '../../utils/LocalStorage'
import RewardsModel from '../../models/RewardsModel'

export const REWARDS_FETCH_START = 'rewards/FETCH_START'
export const REWARDS_DATA = 'rewards/DATA'

const initialState = {
  data: new RewardsModel(),
  isFetching: false,
  isFetched: false
}

export default (state = initialState, action) => {
  switch (action.type) {
    case REWARDS_DATA:
      return {
        ...state,
        data: action.data,
        isFetching: false,
        isFetched: true
      }
    case REWARDS_FETCH_START:
      return {
        ...state,
        isFetching: true
      }
    default:
      return state
  }
}

export const getRewardsData = (silent = false) => dispatch => {
  if (!silent) {
    dispatch({type: REWARDS_FETCH_START})
  }
  return RewardsDAO.getRewardsData(LS.getAccount()).then(data => {
    dispatch({type: REWARDS_DATA, data})
  })
}

export const withdrawRevenue = () => dispatch => {
  dispatch({type: REWARDS_FETCH_START})
  return RewardsDAO.withdrawRewardsFor(LS.getAccount()).then(() => {
    return dispatch(getRewardsData())
  })
}

export const closePeriod = () => dispatch => {
  dispatch({type: REWARDS_FETCH_START})
  return RewardsDAO.closePeriod()
}

export const watchInitRewards = () => dispatch => {
  const callback = () => dispatch(getRewardsData(true))
  RewardsDAO.watchPeriodClosed(callback)
  LHTProxyDAO.watchTransferPlain(callback)
}
