import { Map } from 'immutable'
import AbstractContractDAO from './AbstractContractDAO'
import AbstractMultisigContractDAO from './AbstractMultisigContractDAO'
import IPFS from '../utils/IPFS'
import CBEModel from '../models/CBEModel'
import CBENoticeModel from '../models/notices/CBENoticeModel'
import ProfileModel from '../models/ProfileModel'

class UserStorageDAO extends AbstractContractDAO {
  /**
   * @param account
   * @param block
   * @returns {Promise.<bool>}
   */
  isCBE (account: string, block) {
    return this._call('getCBE', [account], block)
  }

  usersTotal () {
    return this._callNum('userCount').then(r => r - 1)
  }

  getMemberId (account: string) {
    return this._callNum('getMemberId', [account])
  }

  getSignsRequired () {
    return this._callNum('required')
  }

  getAdminCount () {
    return this._callNum('adminCount')
  }

  /** @returns {Promise.<Map[string,CBEModel]>} associated with CBE account address */
  getCBEList () {
    return new Promise(resolve => {
      this._call('getCBEMembers').then(([addresses, hashes]) => {
        let map = new Map()
        const callback = (address, hash) => {
          this._ipfs(hash).then(data => {
            const user = new ProfileModel(data)
            map = map.set(address, new CBEModel({
              address: address,
              name: user.name(),
              user
            }))
            if (map.size === addresses.length) {
              resolve(map)
            }
          })
        }
        for (let key in addresses) {
          if (addresses.hasOwnProperty(key) && hashes.hasOwnProperty(key)) {
            callback(addresses[key], hashes[key])
          }
        }
      })
    })
  }
}
const storage = new UserStorageDAO(require('chronobank-smart-contracts/build/contracts/UserStorage.json'))

export const TX_ADD_CBE = 'addCBE'
export const TX_REVOKE_CBE = 'revokeCBE'
export const TX_SET_REQUIRED_SIGNS = 'setRequired'
export const TX_SET_OWN_HASH = 'setOwnHash'
export const TX_SET_MEMBER_HASH = 'setMemberHash'

class UserDAO extends AbstractMultisigContractDAO {
  isCBE (account: string, block) {
    return storage.isCBE(account, block)
  }

  usersTotal () {
    return storage.usersTotal()
  }

  getCBEList () {
    return storage.getCBEList()
  }

  getMemberId (account: string) {
    return storage.getMemberId(account)
  }

  getSignsRequired () {
    return storage.getSignsRequired()
  }

  getAdminCount () {
    return storage.getAdminCount()
  }

  /**
   * @param account for which you want to get profile
   * @param block
   * @returns {Promise.<ProfileModel>}
   */
  getMemberProfile (account: string, block) {
    return this._call('getMemberHash', [account], block).then(hash =>
      this._ipfs(hash).then(data => new ProfileModel(data)))
  }

  /**
   * @param account
   * @param profile
   * @returns {Promise.<[boolean,string]>} isNew & bytes32 profile IPFS hash
   * @private
   */
  _saveMemberProfile (account: string, profile: ProfileModel) {
    return this.getMemberProfile(account).then(current => {
      if (JSON.stringify(current.toJS()) === JSON.stringify(profile.toJS())) {
        return [null, false]
      }
      return IPFS.put(profile.toJS()).then(hash => {
        return [this._c.ipfsHashToBytes32(hash), true]
      })
    })
  }

  /**
   * @param account
   * @param profile
   * @param own true to change own profile, false to change foreign profile
   * @returns {Promise.<bool>}
   */
  setMemberProfile (account: string, profile: ProfileModel, own: boolean = true) {
    return this._saveMemberProfile(account, profile).then(([hash, isNew]) => {
      if (!isNew) {
        return true
      }
      return own
        ? this._tx(TX_SET_OWN_HASH, [hash], profile.toJS())
        : this._tx(TX_SET_MEMBER_HASH, [account, hash], {address: account, ...profile.toJS()})
    })
  }

  /**
   * @param cbe
   * @returns {Promise.<bool>} result
   */
  treatCBE (cbe: CBEModel) {
    return this.getMemberProfile(cbe.address()).then(user => {
      return this._saveMemberProfile(cbe.address(), user.set('name', cbe.name())).then(([hash, isNewHash]) => {
        return this.isCBE(cbe.address()).then(isCBE => {
          return isCBE && !isNewHash ? cbe : this._tx(TX_ADD_CBE, [cbe.address(), hash], {
            address: cbe.address(),
            name: cbe.name()
          })
        })
      })
    })
  }

  /**
   * @param cbe
   * @returns {Promise.<bool>} result
   */
  revokeCBE (cbe: CBEModel) {
    return this._tx(TX_REVOKE_CBE, [cbe.address()], {
      address: cbe.address(),
      name: cbe.name()
    })
  }

  /**
   * @param n
   * @returns {Promise.<bool>} result
   */
  setRequired (n: number) {
    return this._tx(TX_SET_REQUIRED_SIGNS, [n])
  }

  /**
   * @param callback will receive...
   * @see CBENoticeModel with updated/revoked element and isOld flag
   */
  watchCBE (callback) {
    return this._watch('CBEUpdate', (result, block, time, isOld) => {
      const address = result.args.key
      this.isCBE(address, block).then(isNotRevoked => {
        this.getMemberProfile(address, block).then(user => {
          callback(new CBENoticeModel({
            time,
            cbe: new CBEModel({
              address,
              user,
              name: user.name()
            }),
            isRevoked: !isNotRevoked
          }), isOld)
        })
      })
    })
  }

  _decodeArgs (func, args) {
    return new Promise(resolve => {
      switch (func) {
        case TX_ADD_CBE:
          this._ipfs(args._hash).then(data => {
            const profile = new ProfileModel(data)
            resolve({
              address: args._key,
              name: profile.name()
            })
          })
          break
        case TX_REVOKE_CBE:
          this.getMemberProfile(args._key).then(profile => {
            resolve({
              address: args._key,
              name: profile.name()
            })
          })
          break

        default:
          resolve(args)
      }
    })
  }

  _multisigFuncs () {
    return {
      [TX_ADD_CBE]: ['address', true],
      [TX_REVOKE_CBE]: ['address', false]
    }
  }
}

export default new UserDAO(require('chronobank-smart-contracts/build/contracts/UserManager.json'))
