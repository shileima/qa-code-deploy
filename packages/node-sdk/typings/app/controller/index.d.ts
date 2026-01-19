// This file is created by egg-ts-helper@1.35.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportApi from '../../../app/controller/api';
import ExportFileUplaod from '../../../app/controller/fileUplaod';

declare module 'egg' {
  interface IController {
    api: ExportApi;
    fileUplaod: ExportFileUplaod;
  }
}
