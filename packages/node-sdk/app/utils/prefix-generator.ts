import { createHash, randomBytes } from 'crypto';

/**
 * 生成随机前缀（小写字母+数字）
 * @param length 前缀长度，默认16
 * @returns 随机前缀字符串
 */
export const generatePrefix = (length: number = 16): string => {
  // 使用随机字节生成前缀
  const randomHex = randomBytes(Math.ceil(length / 2)).toString('hex');
  // 转换为小写并截取指定长度
  return randomHex.substring(0, length).toLowerCase();
};

/**
 * 验证前缀格式
 * @param prefix 前缀字符串
 * @param minLength 最小长度，默认8
 * @returns 是否有效
 */
export const validatePrefix = (prefix: string, minLength: number = 8): boolean => {
  // 仅允许小写字母和数字，至少 minLength 位
  const regex = new RegExp(`^[a-z0-9]{${minLength},}$`);
  return regex.test(prefix);
};

/**
 * 生成唯一前缀（通过已存在的前缀列表检查唯一性）
 * @param length 前缀长度，默认16
 * @param existingPrefixes 已存在的前缀列表
 * @param maxAttempts 最大尝试次数，默认100
 * @returns 唯一的前缀字符串
 */
export const generateUniquePrefix = (
  length: number = 16,
  existingPrefixes: string[] = [],
  maxAttempts: number = 100
): string => {
  const prefixesSet = new Set(existingPrefixes);
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const prefix = generatePrefix(length);
    if (!prefixesSet.has(prefix)) {
      return prefix;
    }
  }
  
  throw new Error(`无法生成唯一前缀（已尝试 ${maxAttempts} 次）`);
};