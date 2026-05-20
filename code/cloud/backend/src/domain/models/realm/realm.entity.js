"use strict";
/**
 * RealmEntity - 服务器/工作空间实体（聚合根）
 *
 * Realm 是 Cove 的顶层容器，代表一个工作空间或团队空间。
 * 类似于 Slack Workspace 或 Discord Server。
 *
 * 业务规则：
 * - realm_id 不能为空
 * - name 不能为空且长度在 1-50 之间
 * - owner_id 不能为空
 * - status 只能是 active | suspended | archived
 * - visibility 只能是 public | private
 * - Entity 是不可变的（更新返回新实例）
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RealmEntity = void 0;
const VALID_REALM_STATUSES = ['active', 'suspended', 'archived'];
const VALID_REALM_VISIBILITIES = ['public', 'private'];
const VALID_MEMBER_ROLES = ['member', 'guest'];
class RealmEntity {
    props;
    constructor(props) {
        this.props = props;
        this.validate();
    }
    static create(props) {
        return new RealmEntity(props);
    }
    static fromJSON(json) {
        return RealmEntity.create({
            realm_id: json.realm_id,
            name: json.name,
            display_name: json.display_name,
            description: json.description,
            owner_id: json.owner_id,
            status: json.status,
            visibility: json.visibility,
            settings: json.settings,
            limits: json.limits,
            created_at: new Date(json.created_at),
            updated_at: new Date(json.updated_at),
            meta: json.meta,
        });
    }
    validate() {
        // Validate realm_id
        if (!this.props.realm_id || this.props.realm_id.trim() === '') {
            throw new Error('Server ID cannot be empty');
        }
        // Validate name
        if (!this.props.name || this.props.name.trim() === '') {
            throw new Error('Server name cannot be empty');
        }
        if (this.props.name.length > 50) {
            throw new Error('Server name cannot exceed 50 characters');
        }
        // Validate display_name
        if (!this.props.display_name || this.props.display_name.trim() === '') {
            throw new Error('Server display name cannot be empty');
        }
        if (this.props.display_name.length > 100) {
            throw new Error('Server display name cannot exceed 100 characters');
        }
        // Validate owner_id
        if (!this.props.owner_id || this.props.owner_id.trim() === '') {
            throw new Error('Owner ID cannot be empty');
        }
        // Validate status
        if (!VALID_REALM_STATUSES.includes(this.props.status)) {
            throw new Error(`Invalid realm status: ${this.props.status}. Must be one of: ${VALID_REALM_STATUSES.join(', ')}`);
        }
        // Validate visibility
        if (!VALID_REALM_VISIBILITIES.includes(this.props.visibility)) {
            throw new Error(`Invalid realm visibility: ${this.props.visibility}. Must be one of: ${VALID_REALM_VISIBILITIES.join(', ')}`);
        }
        // Validate default_member_role
        if (!VALID_MEMBER_ROLES.includes(this.props.settings.default_member_role)) {
            throw new Error(`Invalid default member role: ${this.props.settings.default_member_role}. Must be one of: ${VALID_MEMBER_ROLES.join(', ')}`);
        }
        // Validate limits
        if (this.props.limits.max_members <= 0) {
            throw new Error('Max members must be greater than 0');
        }
        if (this.props.limits.max_projects < 0) {
            throw new Error('Max projects cannot be negative');
        }
        if (this.props.limits.max_channels < 0) {
            throw new Error('Max channels cannot be negative');
        }
        if (this.props.limits.max_agents < 0) {
            throw new Error('Max agents cannot be negative');
        }
        if (this.props.limits.max_storage_gb <= 0) {
            throw new Error('Max storage must be greater than 0');
        }
    }
    // --- Getters ---
    get realm_id() { return this.props.realm_id; }
    get name() { return this.props.name; }
    get display_name() { return this.props.display_name; }
    get description() { return this.props.description; }
    get owner_id() { return this.props.owner_id; }
    get status() { return this.props.status; }
    get visibility() { return this.props.visibility; }
    get settings() { return this.props.settings; }
    get limits() { return this.props.limits; }
    get created_at() { return this.props.created_at; }
    get updated_at() { return this.props.updated_at; }
    get meta() { return this.props.meta; }
    // --- Status checks ---
    isActive() { return this.props.status === 'active'; }
    isSuspended() { return this.props.status === 'suspended'; }
    isArchived() { return this.props.status === 'archived'; }
    canAcceptMembers() { return this.props.status === 'active'; }
    canCreateProjects() { return this.props.status === 'active'; }
    // --- Visibility checks ---
    isPublic() { return this.props.visibility === 'public'; }
    isPrivate() { return this.props.visibility === 'private'; }
    // --- Settings checks ---
    allowsPublicChannels() { return this.props.settings.allow_public_channels; }
    allowsPrivateChannels() { return this.props.settings.allow_private_channels; }
    allowsDM() { return this.props.settings.allow_dm; }
    requiresApproval() { return this.props.settings.require_approval; }
    // --- Immutable updates ---
    updateStatus(status) {
        return RealmEntity.create({
            ...this.props,
            status,
            updated_at: new Date(),
        });
    }
    suspend() {
        if (this.props.status !== 'active') {
            throw new Error('Only active servers can be suspended');
        }
        return RealmEntity.create({
            ...this.props,
            status: 'suspended',
            updated_at: new Date(),
        });
    }
    activate() {
        if (this.props.status !== 'suspended') {
            throw new Error('Only suspended realms can be activated');
        }
        return RealmEntity.create({
            ...this.props,
            status: 'active',
            updated_at: new Date(),
        });
    }
    archive() {
        if (this.props.status === 'archived') {
            throw new Error('Realm is already archived');
        }
        return RealmEntity.create({
            ...this.props,
            status: 'archived',
            updated_at: new Date(),
        });
    }
    unarchive() {
        if (this.props.status !== 'archived') {
            throw new Error('Only archived servers can be unarchived');
        }
        return RealmEntity.create({
            ...this.props,
            status: 'active',
            updated_at: new Date(),
        });
    }
    updateName(name) {
        if (!name || name.trim() === '') {
            throw new Error('Server name cannot be empty');
        }
        if (name.length > 50) {
            throw new Error('Server name cannot exceed 50 characters');
        }
        return RealmEntity.create({
            ...this.props,
            name: name.trim(),
            updated_at: new Date(),
        });
    }
    updateDisplayName(display_name) {
        if (!display_name || display_name.trim() === '') {
            throw new Error('Server display name cannot be empty');
        }
        if (display_name.length > 100) {
            throw new Error('Server display name cannot exceed 100 characters');
        }
        return RealmEntity.create({
            ...this.props,
            display_name: display_name.trim(),
            updated_at: new Date(),
        });
    }
    updateDescription(description) {
        return RealmEntity.create({
            ...this.props,
            description: description?.trim(),
            updated_at: new Date(),
        });
    }
    updateVisibility(visibility) {
        return RealmEntity.create({
            ...this.props,
            visibility,
            updated_at: new Date(),
        });
    }
    updateSettings(settings) {
        return RealmEntity.create({
            ...this.props,
            settings: {
                ...this.props.settings,
                ...settings,
            },
            updated_at: new Date(),
        });
    }
    updateLimits(limits) {
        const newLimits = {
            ...this.props.limits,
            ...limits,
        };
        // Validate new limits
        if (newLimits.max_members <= 0) {
            throw new Error('Max members must be greater than 0');
        }
        if (newLimits.max_projects < 0) {
            throw new Error('Max projects cannot be negative');
        }
        if (newLimits.max_channels < 0) {
            throw new Error('Max channels cannot be negative');
        }
        if (newLimits.max_agents < 0) {
            throw new Error('Max agents cannot be negative');
        }
        if (newLimits.max_storage_gb <= 0) {
            throw new Error('Max storage must be greater than 0');
        }
        return RealmEntity.create({
            ...this.props,
            limits: newLimits,
            updated_at: new Date(),
        });
    }
    updateMeta(meta) {
        return RealmEntity.create({
            ...this.props,
            meta: {
                ...this.props.meta,
                ...meta,
            },
            updated_at: new Date(),
        });
    }
    // --- Equality (by ID) ---
    equals(other) {
        return this.props.realm_id === other.props.realm_id;
    }
    // --- Serialization ---
    toJSON() {
        return {
            realm_id: this.props.realm_id,
            name: this.props.name,
            display_name: this.props.display_name,
            description: this.props.description,
            owner_id: this.props.owner_id,
            status: this.props.status,
            visibility: this.props.visibility,
            settings: this.props.settings,
            limits: this.props.limits,
            created_at: this.props.created_at.toISOString(),
            updated_at: this.props.updated_at.toISOString(),
            meta: this.props.meta,
        };
    }
}
exports.RealmEntity = RealmEntity;
