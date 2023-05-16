import {
  RequestBeginBlock,
  RequestInfo,
  RequestInitChain,
  RequestOfferSnapshot,
  RequestQuery,
  ResponseApplySnapshotChunk,
  ResponseBeginBlock,
  ResponseCheckTx,
  ResponseCommit,
  ResponseDeliverTx,
  ResponseEndBlock,
  ResponseInfo,
  ResponseInitChain,
  ResponseListSnapshots,
  ResponseOfferSnapshot,
  ResponseQuery,
  ResponseSetOption
} from 'jackal.js-protos/dist/postgen/tendermint/abci/types'

export default interface IAbciHandler {
  getEcho(message: string): Promise<string>
  // getFlush ()
  getBlockInfo(versions: RequestInfo): Promise<ResponseInfo>
  setOptionByKeyValue(key: string, value: string): Promise<ResponseSetOption>
  initializeChain(object: RequestInitChain): Promise<ResponseInitChain>
  getQuery(object: RequestQuery): Promise<ResponseQuery>
  getBeginBlock(object: RequestBeginBlock): Promise<ResponseBeginBlock>
  getCheckTx(tx: Uint8Array, type: number): Promise<ResponseCheckTx>
  getDeliverTx(tx: Uint8Array): Promise<ResponseDeliverTx>
  getEndBlock(height: number): Promise<ResponseEndBlock>
  getCommit(): Promise<ResponseCommit>
  getlistSnapshots(): Promise<ResponseListSnapshots>
  getOfferSnapshot(object: RequestOfferSnapshot): Promise<ResponseOfferSnapshot>
  getSnapshotChunk(
    height: number,
    format: number,
    chunk: number
  ): Promise<Uint8Array>
  putSnapshotChunk(
    index: number,
    chunk: Uint8Array,
    sender: string
  ): Promise<ResponseApplySnapshotChunk>
}
