/**
 * RealmContext 单元测试
 */

import { describe, it, expect } from 'vitest';
import { RealmContext } from '../realm-context';

describe('RealmContext', () => {
  describe('构造函数', () => {
    it('应该成功创建 RealmContext', () => {
      const context = new RealmContext('server-001', 'user-001');

      expect(context.realmId).toBe('server-001');
      expect(context.userId).toBe('user-001');
    });

    it('应该在 realmId 为空时抛出错误', () => {
      expect(() => new RealmContext('', 'user-001')).toThrow('realmId is required');
    });

    it('应该在 userId 为空时抛出错误', () => {
      expect(() => new RealmContext('server-001', '')).toThrow('userId is required');
    });
  });

  describe('create 工厂方法', () => {
    it('应该通过工厂方法创建 RealmContext', () => {
      const context = RealmContext.create('server-001', 'user-001');

      expect(context).toBeInstanceOf(RealmContext);
      expect(context.realmId).toBe('server-001');
      expect(context.userId).toBe('user-001');
    });

    it('应该在参数无效时抛出错误', () => {
      expect(() => RealmContext.create('', 'user-001')).toThrow('realmId is required');
      expect(() => RealmContext.create('server-001', '')).toThrow('userId is required');
    });
  });

  describe('toJSON', () => {
    it('应该正确序列化为 JSON', () => {
      const context = new RealmContext('server-001', 'user-001');
      const json = context.toJSON();

      expect(json).toEqual({
        realmId: 'server-001',
        userId: 'user-001',
      });
    });
  });

  describe('toString', () => {
    it('应该返回可读的字符串表示', () => {
      const context = new RealmContext('server-001', 'user-001');
      const str = context.toString();

      expect(str).toBe('RealmContext(realmId=server-001, userId=user-001)');
    });
  });

  describe('不可变性', () => {
    it('realmId 应该是只读的（TypeScript 编译时检查）', () => {
      const context = new RealmContext('server-001', 'user-001');

      // TypeScript 的 readonly 是编译时检查，运行时可以修改
      // 但我们验证初始值是正确的
      expect(context.realmId).toBe('server-001');

      // 尝试修改（TypeScript 会在编译时报错）
      // @ts-expect-error - 测试只读属性
      context.realmId = 'server-002';

      // 运行时实际上可以修改，但这违反了 TypeScript 的类型约定
      // 在实际使用中，TypeScript 编译器会阻止这种操作
    });

    it('userId 应该是只读的（TypeScript 编译时检查）', () => {
      const context = new RealmContext('server-001', 'user-001');

      // TypeScript 的 readonly 是编译时检查，运行时可以修改
      // 但我们验证初始值是正确的
      expect(context.userId).toBe('user-001');

      // 尝试修改（TypeScript 会在编译时报错）
      // @ts-expect-error - 测试只读属性
      context.userId = 'user-002';

      // 运行时实际上可以修改，但这违反了 TypeScript 的类型约定
      // 在实际使用中，TypeScript 编译器会阻止这种操作
    });
  });

  describe('多实例', () => {
    it('不同的 RealmContext 实例应该独立', () => {
      const context1 = new RealmContext('server-001', 'user-001');
      const context2 = new RealmContext('server-002', 'user-002');

      expect(context1.realmId).toBe('server-001');
      expect(context2.realmId).toBe('server-002');
      expect(context1).not.toBe(context2);
    });
  });
});
