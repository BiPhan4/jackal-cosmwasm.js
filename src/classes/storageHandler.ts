import {
  IQueryHandler,
  IStorageHandler,
  IWalletHandler
} from '@/interfaces/classes'
import { EncodeObject } from '@cosmjs/proto-signing'
import {
  IPayData,
  ISharedTracker,
  IStoragePaymentInfo,
  IStray
} from '@/interfaces'
import { handlePagination, numTo3xTB, signerNotEnabled } from '@/utils/misc'
import { DeliverTxResponse } from '@cosmjs/stargate'
import {
  readFileTreeEntry,
  removeFileTreeEntry,
  saveFileTreeEntry
} from '@/utils/compression'
import { toUtf8 } from "@cosmjs/encoding";

export default class StorageHandler implements IStorageHandler {
  private readonly walletRef: IWalletHandler
  private readonly qH: IQueryHandler

  /**
   * Receives properties from trackStorage() instantiate StorageHandler.
   * @param {IWalletHandler} wallet - Query or signing WalletHandler instance.
   * @private
   */
  private constructor(wallet: IWalletHandler) {
    this.walletRef = wallet
    this.qH = wallet.getQueryHandler()
  }

  /**
   * Creates StorageHandler instance.
   * @param {IWalletHandler} wallet - Query or signing WalletHandler instance.
   * @returns {Promise<IStorageHandler>} - StorageHandler instance linked to provided WalletHandler instance.
   */
  static async trackStorage(wallet: IWalletHandler): Promise<IStorageHandler> {
    return new StorageHandler(wallet)
  }

  /**
   * Purchase storage for specified address that does not currently have storage. For existing see upgradeStorage().
   * @param {string} forAddress - Jkl address to receive the purchased storage.
   * @param {number} duration - How long in months to purchase the storage.
   * @param {number} space - Amount of effective storage to purchase in TB.
   * @returns {Promise<DeliverTxResponse>} - Result of purchase broadcast.
   */
  async buyStorage(
    forAddress: string,
    duration: number,
    space: number
  ): Promise<DeliverTxResponse> {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'buyStorage'))
    const pH = this.walletRef.getProtoHandler()
    const msg: EncodeObject = pH.storageTx.msgBuyStorage({
      creator: this.walletRef.getJackalAddress(),
      forAddress,
      duration: `${duration * 720 || 720}h`,
      bytes: numTo3xTB(space),
      paymentDenom: 'ujkl'
    })
    return await pH.debugBroadcaster([msg], {})
  }

  /**
   * Purchase storage for specified address that currently has storage. For new see buyStorage().
   * @param {string} forAddress - Jkl address to receive the purchased storage.
   * @param {number} duration - How long in months to purchase the storage.
   * @param {number} space - Amount of effective storage to purchase in TB.
   * @returns {Promise<DeliverTxResponse>} - Result of purchase broadcast.
   */
  async upgradeStorage(
    forAddress: string,
    duration: number,
    space: number
  ): Promise<DeliverTxResponse> {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'upgradeStorage'))
    const pH = this.walletRef.getProtoHandler()
    const msg: EncodeObject = pH.storageTx.msgUpgradeStorage({
      creator: this.walletRef.getJackalAddress(),
      forAddress,
      duration: `${duration * 720 || 720}h`,
      bytes: numTo3xTB(space),
      paymentDenom: 'ujkl'
    })
    return await pH.debugBroadcaster([msg], {})
  }

  /**
   * Initialize address' storage system. Replaces WalletHandler.initAccount().
   * @returns {EncodeObject} - Postkey msg ready for broadcast.
   */
  // take in a submessage?
  makeStorageInitMsg(): EncodeObject {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'makeStorageInitMsg'))
    const pH = this.walletRef.getProtoHandler()

    return pH.fileTreeTx.msgPostkey({
      creator: this.walletRef.getJackalAddress(),
      key: this.walletRef.getPubkey()
    })
    
  }

    /**
   * Initialize address' storage system. Replaces WalletHandler.initAccount().
   * @returns {EncodeObject} - Postkey msg ready for broadcast.
   */
  // can be consumed by make initial directories?
  // if you want to send in post key as the submessage, you need to pass in 
  // this.walletRef.getPubKey() somehow 
  // Is it possible to pass it in outside of jackal-cosmwasm.js repo? or need to pass it in here?
  // Should you have a cosmwasmHandler that will implement IStorageHandler fully? separate file for cleanliness
  // if it returns encode 
  // you also have to take custom addresses too mang 

  makeStorageInitForWasmMsg(): EncodeObject {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'makeStorageInitMsg'))
    const pH = this.walletRef.getProtoHandler()

    const postKeyMsg = {
      post_key: {
        key: this.walletRef.getPubkey(),
      }
    };

    return pH.cosmwasmTx.msgExecuteContract({
      sender: this.walletRef.getJackalAddress(),
      contract: "jkl14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9scsc9nr",
      msg: toUtf8(JSON.stringify(postKeyMsg)),
      funds: [],
    })
    
  }

  // Calling the contract to use 'send_cosmos_msg_cli'

  sendCosmosMsgCLI(): EncodeObject {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'makeStorageInitMsg'))
    const pH = this.walletRef.getProtoHandler()

    // This enum of ExecuteMsg actually takes no args
    const sendCosmosMsgsCli = {
      send_cosmos_msgs_cli: {}
    };

    return pH.cosmwasmTx.msgExecuteContract({
      sender: this.walletRef.getJackalAddress(),
      contract: "wasm14hj2tavq8fpesdwxxcu44rty3hh90vhujrvcmstl4zr3txmfvw9s0phg4d", // deployed outpost on dev net always has same name
      msg: toUtf8(JSON.stringify(sendCosmosMsgsCli)),
      funds: [],
    })
  }
  
  /**
   * Find all strays in the storage deals system.
   * @returns {Promise<IStray[]>}
   */
  async getAllStrays(): Promise<IStray[]> {
    return (
      await handlePagination(this.qH.storageQuery, 'queryStraysAll', {})
    ).reduce((acc: IStray[], curr: any) => {
      acc.push(...curr.strays)
      return acc
    }, [])
  }

  /**
   * Determine how much space jkl address has remaining.
   * @param {string} address - Jkl address to check.
   * @returns {Promise<number>} - Remaining space in bytes.
   */
  async getClientFreeSpace(address: string): Promise<number> {
    return (await this.qH.storageQuery.queryGetClientFreeSpace({ address }))
      .value.bytesfree
  }

  /**
   * Determine current price in $JKL of specified size and duration of storage.
   * @param {number} space - Amount of effective space to use for price check.
   * @param {number} duration - Amount of time to use for price check.
   * @returns {Promise<number>} - Estimated price of specified storage in ujkl.
   */
  async getStorageJklPrice(space: number, duration: number): Promise<number> {
    const request = {
      bytes: Number(numTo3xTB(space)),
      duration: `${duration * 720 || 720}h`
    }
    return (await this.qH.storageQuery.queryPriceCheck(request)).value.price
  }

  /**
   * Determine what storage plan (if any) has been purchased for the provided jkl address.
   * @param {string} address - Jkl address to check.
   * @returns {Promise<IPayData>} - Storage plan details.
   */
  async getPayData(address: string): Promise<IPayData> {
    return (await this.qH.storageQuery.queryGetPayData({ address })).value
  }

  /**
   * Determine space used and available for provided jkl address.
   * @param {string} address - Jkl address to check.
   * @returns {Promise<IStoragePaymentInfo>} - Space used and available. Defaults to zeros when nothing is found.
   */
  async getStoragePaymentInfo(address: string): Promise<IStoragePaymentInfo> {
    const result = (
      await this.qH.storageQuery.queryStoragePaymentInfo({ address })
    ).value.storagePaymentInfo
    return result ? result : { spaceAvailable: 0, spaceUsed: 0, address: '' }
  }

  /** Manage FT Noti */
  private readonly sharingRoot = 's/Sharing'

  /**
   * Save data to file sharing address. Overwrites existing data. Savable only by owner.
   * @param {string} receiverAddress - Jkl address receiving sharing data.
   * @param {ISharedTracker} shared - Bundle of all records shared with receiverAddress.
   * @returns {Promise<EncodeObject>} - PostFile msg ready for broadcast.
   */
  async saveSharing(
    receiverAddress: string,
    shared: ISharedTracker
  ): Promise<EncodeObject> {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'saveSharing'))
    return await saveFileTreeEntry(
      receiverAddress,
      this.sharingRoot,
      receiverAddress,
      shared,
      this.walletRef,
      true
    )
  }

  /**
   * Read data saved with saveSharing(). accessible by owner and sharing receiver.
   * @param {string} owner - data owner's jkl address.
   * @param {string} receiverAddress - Jkl address receiving sharing data.
   * @returns {Promise<ISharedTracker>} - Bundle of all records shared with receiver.
   */
  async readSharing(
    owner: string,
    receiverAddress: string
  ): Promise<ISharedTracker> {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'readSharing'))
    const shared = await readFileTreeEntry(
      owner,
      `${this.sharingRoot}/${receiverAddress}`,
      this.walletRef,
      true
    ).catch((err) => {
      throw new Error(
        `Storage.Handler - readSharing() JSON Parse Failed: ${err.message}`
      )
    })
    return shared as ISharedTracker
  }

  /**
   * Remove all sharing data for specified receiver.
   * @param {string} receiverAddress - Jkl address receiving sharing data.
   * @returns {Promise<EncodeObject>} - DeleteFile msg ready for broadcast.
   */
  async stopSharing(receiverAddress: string): Promise<EncodeObject> {
    if (!this.walletRef.traits)
      throw new Error(signerNotEnabled('StorageHandler', 'stopSharing'))
    return await removeFileTreeEntry(
      `${this.sharingRoot}/${receiverAddress}`,
      this.walletRef
    )
  }
}
