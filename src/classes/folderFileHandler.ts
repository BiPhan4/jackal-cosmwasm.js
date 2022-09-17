import { hashAndHex } from '@/utils/hash'
import IFileBuffer from '@/interfaces/IFileBuffer'
import IFileConfigRaw from '@/interfaces/IFileConfigRaw'
import FileHandler from '@/classes/fileHandler'
import IFolderFileFrame from '@/interfaces/IFolderFileFrame'
import IFileIo from '@/interfaces/classes/IFileIo'
import IWalletHandler from '@/interfaces/classes/IWalletHandler'
import IFolderFileHandler from '@/interfaces/classes/IFolderFileHandler'
import IFolderDownload from '@/interfaces/IFolderDownload'

const keyAlgo = {
  name: 'AES-GCM',
  length: 256
}

export default class FolderFileHandler extends FileHandler {

  // protected constructor (file: File | ArrayBuffer, mode: boolean, fileConfig: IFileConfigRaw, path: string, key: CryptoKey, iv: Uint8Array) {
  //   super(file, mode, fileConfig, path, key, iv)
  //
  // }
  private folderDetails: IFolderFileFrame
  private whoAmI: string

  constructor () {
    super()




    if (typeof folder === 'string') {
      this.folderDetails = {
        whoAmI: folder,
        dirChildren: [],
        fileChildren: []
      }
      this.whoAmI = folder
    } else {
      this.folderDetails = folder
      this.whoAmI = folder.whoAmI
    }
  }

  static async trackFolder (fileIo: IFileIo, wallet: IWalletHandler, whoAmI: string): Promise<IFolderFileHandler> {
    const cleanWhoAmI = whoAmI.endsWith('/') ? whoAmI : `${whoAmI}/`
    const { data, config, key, iv } = await fileIo.downloadFile(cleanWhoAmI, wallet, true) as IFolderDownload

    if (data) {

      return new FolderFileHandler()
    } else {

      return new FolderFileHandler()
    }

    const rawDecrypt = await folderCrypt(data, new Uint8Array(key), new Uint8Array(iv), 'decrypt')
    const frame: IFolderFileFrame = JSON.parse((new TextDecoder()).decode(rawDecrypt))

    return new FolderFileHandler()
  }
  // static async genFolder () {
  //   const contents = {
  //     path: '',
  //
  //   }
  //   return new File([(new TextEncoder()).encode(JSON.stringify(contents))], 'folder')
  // }





}

async function readFolder (data: ArrayBuffer): Promise<IFolderFileFrame> {
  const workingFile = this.baseFile as File
  const meta = {
    lastModified: workingFile.lastModified as number,
    name: workingFile.name,
    type: workingFile.type
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      resolve({
        meta,
        content: (reader.result) ? reader.result as ArrayBuffer : new ArrayBuffer(0)
      })
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(workingFile)
  })
}

async function folderCrypt (data: ArrayBuffer, rawKey: Uint8Array, iv: Uint8Array, mode: 'encrypt' | 'decrypt'): Promise<ArrayBuffer> {
  const key = await crypto.subtle.importKey('raw', rawKey, 'AES-GCM', true, ['encrypt', 'decrypt'])
  const algo = {
    name: 'AES-GCM',
    iv: iv
  }
  if (data.byteLength < 1) {
    return new ArrayBuffer(0)
  } else if (mode?.toLowerCase() === 'encrypt') {
    return await crypto.subtle.encrypt(algo, key, data)
      .catch(err => {
        throw new Error(err)
      })
  } else {
    return await crypto.subtle.decrypt(algo, key, data)
      .catch(err => {
        throw new Error(err)
      })
  }
}