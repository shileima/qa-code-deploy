import { Service } from 'egg';
import * as VError from 'verror';
import { UserModel } from '@/model';

/**
 * Api Service
 */
export default class API extends Service {
    /**
     * 查询接口列表
     * @param where 查询条件 name appkey path
     */
    async getUser() {
        try {
            let lastResult;
            await UserModel.findAndCountAll().then(result => {
                lastResult = result.rows[0]
            })
            return {
                'rds-orm': lastResult
            }
        } catch (e: any) {
            const verror = new VError({
                cause: e
            }, '查询列表失败');
            throw verror;
        }
    }
}
