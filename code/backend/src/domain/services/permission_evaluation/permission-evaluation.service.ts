/**
 * PermissionEvaluationService - 权限评估领域服务
 *
 * 负责评估用户/Agent 是否有权限执行特定操作。
 */

export interface Permission {
  readonly resource: string;
  readonly action: string;
}

export interface Role {
  readonly name: string;
  readonly permissions: readonly string[];
}

export interface Subject {
  readonly id: string;
  readonly type: 'user' | 'agent';
  readonly roles: readonly string[];
  readonly permissions: readonly string[];
}

export class PermissionEvaluationService {
  private readonly rolePermissions: Map<string, readonly string[]>;

  constructor(roles: readonly Role[]) {
    this.rolePermissions = new Map(
      roles.map(role => [role.name, role.permissions])
    );
  }

  /**
   * 检查主体是否有权限执行操作
   *
   * 权限检查逻辑：
   * 1. 检查主体的直接权限
   * 2. 检查主体角色的权限
   * 3. 支持通配符权限（如 "channel:*"）
   */
  hasPermission(subject: Subject, permission: string): boolean {
    // 检查直接权限
    if (this.matchesPermission(subject.permissions, permission)) {
      return true;
    }

    // 检查角色权限
    for (const roleName of subject.roles) {
      const rolePerms = this.rolePermissions.get(roleName);
      if (rolePerms && this.matchesPermission(rolePerms, permission)) {
        return true;
      }
    }

    return false;
  }

  /**
   * 检查权限列表是否匹配目标权限
   */
  private matchesPermission(
    permissions: readonly string[],
    targetPermission: string
  ): boolean {
    for (const perm of permissions) {
      if (this.isPermissionMatch(perm, targetPermission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * 检查单个权限是否匹配（支持通配符）
   */
  private isPermissionMatch(
    grantedPermission: string,
    requestedPermission: string
  ): boolean {
    // 完全匹配
    if (grantedPermission === requestedPermission) {
      return true;
    }

    // 通配符匹配
    if (grantedPermission.endsWith(':*')) {
      const prefix = grantedPermission.slice(0, -2);
      return requestedPermission.startsWith(prefix + ':');
    }

    // 全局通配符
    if (grantedPermission === '*') {
      return true;
    }

    return false;
  }

  /**
   * 批量检查权限
   */
  hasAllPermissions(
    subject: Subject,
    permissions: readonly string[]
  ): boolean {
    return permissions.every(perm => this.hasPermission(subject, perm));
  }

  /**
   * 检查是否有任一权限
   */
  hasAnyPermission(
    subject: Subject,
    permissions: readonly string[]
  ): boolean {
    return permissions.some(perm => this.hasPermission(subject, perm));
  }

  /**
   * 获取主体的所有有效权限
   */
  getEffectivePermissions(subject: Subject): string[] {
    const permissions = new Set<string>(subject.permissions);

    for (const roleName of subject.roles) {
      const rolePerms = this.rolePermissions.get(roleName);
      if (rolePerms) {
        rolePerms.forEach(perm => permissions.add(perm));
      }
    }

    return Array.from(permissions);
  }

  /**
   * 检查主体是否有管理员权限
   */
  isAdmin(subject: Subject): boolean {
    return (
      subject.roles.includes('admin') ||
      subject.roles.includes('owner') ||
      this.hasPermission(subject, '*')
    );
  }
}
