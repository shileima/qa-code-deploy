import { Controller } from 'egg';
var MSS = require('@dp/mos-mss');

export default class feedbackContactInfo extends Controller {
    // 上传文件到 S3
    async uploadFileToS3(fileStream, fileName) {
      const mss = new MSS({
        appkey: 'com.sankuai.air.data.service',
        endpoint: 'msstest.vip.sankuai.com',
        bucket: 'air-data-manage-file'
    });

    const client = await mss.initKmsClient(); // 初始化为透明化密钥客户端
    try {
      // 直接上传文件流到 S3
      await client.putObject(fileName, fileStream);
      console.log('文件上传成功:', fileName);

      // 获取文件的签名 URL
      const url = client.signatureUrl(fileName);
      console.log('获取URL成功:', url);
      return url; // 返回文件的 URL
    } catch (err) {
      console.error('上传失败:', err);
      throw err;
    }
  }

      // 处理用户上传并上传到 S3
    async handleUpload() {
      const { ctx } = this;
      const fileStream = ctx.files[0]; // 获取文件流
      const fileName = ctx.files[0].filename; // 获取文件名

      try {
        // 上传文件流到 S3
        const fileUrl = await this.uploadFileToS3(fileStream, fileName);
        console.log('文件上传完成，URL:', fileUrl);
        ctx.success({
          ...fileUrl
        });
      } catch (err: any) {
        ctx.appLogger.error('处理上传失败:', err);
        ctx.success({ code: 60001, message: err.message, data: null });
      }
    }
  }
