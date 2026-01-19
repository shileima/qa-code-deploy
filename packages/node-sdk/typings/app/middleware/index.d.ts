// This file is created by egg-ts-helper@1.35.1
// Do not modify this file!!!!!!!!!
/* eslint-disable */

import 'egg';
import ExportCat from '../../../app/middleware/cat';
import ExportCustomHandler from '../../../app/middleware/custom-handler';
import ExportErrorHandler from '../../../app/middleware/error-handler';
import ExportLogger from '../../../app/middleware/logger';
import ExportMtracer from '../../../app/middleware/mtracer';

declare module 'egg' {
  interface IMiddleware {
    cat: typeof ExportCat;
    customHandler: typeof ExportCustomHandler;
    errorHandler: typeof ExportErrorHandler;
    logger: typeof ExportLogger;
    mtracer: typeof ExportMtracer;
  }
}
