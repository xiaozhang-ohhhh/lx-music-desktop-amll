import { exposeWorker } from '../utils/worker'

import * as common from './common'
import * as lyric from './lyric'
import * as list from './list'
import * as music from './music'


console.log('hello main worker')


exposeWorker(Object.assign({}, common, lyric, list, music))

export type workerMainTypes = typeof common
  & typeof lyric
  & typeof list
  & typeof music
