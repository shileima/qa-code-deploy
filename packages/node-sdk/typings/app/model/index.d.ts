// This file is created by egg-ts-helper@1.35.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportApi from '../../../app/model/api';
import ExportIndex from '../../../app/model/index';

declare module 'egg' {
  interface IModel {
    Api: ReturnType<typeof ExportApi>;
    Index: ReturnType<typeof ExportIndex>;
  }
}
