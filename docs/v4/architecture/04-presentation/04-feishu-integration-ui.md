# Feishu Integration Frontend (飞书集成前端适配)

> **版本**: v4.0  
> **日期**: 2026-05-07  
> **关键词**: `飞书集成`, `OAuth登录`, `用户映射`, `同步状态`, `UI设计`

**本文档包含**:
- 飞书登录组件设计
- 飞书用户映射 UI
- 飞书同步状态显示
- 错误处理和边界情况

**适用场景**:
- 实现飞书登录功能
- 设计飞书用户映射界面
- 显示飞书同步状态

**相关文档**:
- [Backend API](../03-infrastructure/04-backend-api.md) - 后端飞书集成设计
- [API Integration](./01-api-integration.md) - API 集成

---

## 1. 飞书登录组件

### 1.1 登录按钮

```tsx
// frontend/src/components/FeishuLoginButton.tsx

import { Button } from '@/components/ui/button';
import { FeishuIcon } from '@/components/icons';

export function FeishuLoginButton() {
  const handleLogin = () => {
    // 跳转到飞书 OAuth 授权页面
    const clientId = import.meta.env.VITE_FEISHU_CLIENT_ID;
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/auth/feishu/callback`
    );
    const state = generateRandomState();
    
    // 保存 state 到 sessionStorage 用于验证
    sessionStorage.setItem('feishu_oauth_state', state);
    
    const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${clientId}&redirect_uri=${redirectUri}&state=${state}`;
    
    window.location.href = authUrl;
  };

  return (
    <Button
      onClick={handleLogin}
      leftIcon={<FeishuIcon />}
      colorScheme="blue"
      size="lg"
    >
      使用飞书登录
    </Button>
  );
}

function generateRandomState() {
  return Math.random().toString(36).substring(2, 15);
}
```

### 1.2 OAuth 回调处理

```tsx
// frontend/src/pages/FeishuCallbackPage.tsx

import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useFeishuAuth } from '@/hooks/useFeishuAuth';

export function FeishuCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleCallback, isLoading, error } = useFeishuAuth();

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const savedState = sessionStorage.getItem('feishu_oauth_state');

    // 验证 state
    if (state !== savedState) {
      console.error('State mismatch');
      navigate('/login?error=invalid_state');
      return;
    }

    if (code) {
      handleCallback(code);
    } else {
      navigate('/login?error=no_code');
    }
  }, [searchParams]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Spinner size="xl" />
        <Text ml={4}>正在登录...</Text>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Alert status="error">
          <AlertIcon />
          <AlertDescription>
            登录失败：{error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
```

### 1.3 useFeishuAuth Hook

```tsx
// frontend/src/hooks/useFeishuAuth.ts

import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api-client';

export function useFeishuAuth() {
  const navigate = useNavigate();

  const { mutate: handleCallback, isPending, error } = useMutation({
    mutationFn: (code: string) =>
      apiClient.post('/auth/feishu/callback', { code }),
    onSuccess: (data) => {
      // 保存 token
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user_id', data.user_id);
      
      // 跳转到首页
      navigate('/');
    },
    onError: (err) => {
      console.error('Feishu auth failed:', err);
      navigate('/login?error=auth_failed');
    },
  });

  return {
    handleCallback,
    isLoading: isPending,
    error,
  };
}
```

---

## 2. 飞书用户映射 UI

### 2.1 用户映射设置页面

```tsx
// frontend/src/pages/FeishuMappingPage.tsx

import { useState } from 'react';
import { useFeishuMapping } from '@/hooks/useFeishuMapping';

export function FeishuMappingPage() {
  const { mappings, isLoading, createMapping, deleteMapping } = useFeishuMapping();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <Heading size="lg">飞书用户映射</Heading>
        <Button
          onClick={() => setShowCreateDialog(true)}
          leftIcon={<AddIcon />}
        >
          添加映射
        </Button>
      </div>

      {isLoading ? (
        <Spinner />
      ) : (
        <MappingTable
          mappings={mappings}
          onDelete={deleteMapping}
        />
      )}

      <CreateMappingDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreate={createMapping}
      />
    </div>
  );
}
```

### 2.2 映射表格

```tsx
// frontend/src/components/MappingTable.tsx

interface MappingTableProps {
  mappings: FeishuUserMapping[];
  onDelete: (mappingId: string) => void;
}

export function MappingTable({ mappings, onDelete }: MappingTableProps) {
  return (
    <Table>
      <Thead>
        <Tr>
          <Th>飞书用户</Th>
          <Th>本地用户</Th>
          <Th>映射类型</Th>
          <Th>创建时间</Th>
          <Th>操作</Th>
        </Tr>
      </Thead>
      <Tbody>
        {mappings.map((mapping) => (
          <Tr key={mapping.id}>
            <Td>
              <HStack>
                <Avatar src={mapping.feishu_avatar} size="sm" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">{mapping.feishu_name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {mapping.feishu_user_id}
                  </Text>
                </VStack>
              </HStack>
            </Td>
            <Td>
              <HStack>
                <Avatar src={mapping.local_avatar} size="sm" />
                <VStack align="start" spacing={0}>
                  <Text fontWeight="medium">{mapping.local_name}</Text>
                  <Text fontSize="sm" color="gray.600">
                    {mapping.local_user_id}
                  </Text>
                </VStack>
              </HStack>
            </Td>
            <Td>
              <Badge colorScheme={mapping.mapping_type === 'auto' ? 'green' : 'blue'}>
                {mapping.mapping_type === 'auto' ? '自动' : '手动'}
              </Badge>
            </Td>
            <Td>{formatDate(mapping.created_at)}</Td>
            <Td>
              <IconButton
                icon={<DeleteIcon />}
                aria-label="删除映射"
                size="sm"
                colorScheme="red"
                variant="ghost"
                onClick={() => onDelete(mapping.id)}
              />
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
```

### 2.3 创建映射对话框

```tsx
// frontend/src/components/CreateMappingDialog.tsx

interface CreateMappingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (mapping: CreateMappingInput) => void;
}

export function CreateMappingDialog({ isOpen, onClose, onCreate }: CreateMappingDialogProps) {
  const [feishuUserId, setFeishuUserId] = useState('');
  const [localUserId, setLocalUserId] = useState('');
  const { data: feishuUsers } = useFeishuUsers();
  const { data: localUsers } = useLocalUsers();

  const handleCreate = () => {
    onCreate({
      feishu_user_id: feishuUserId,
      local_user_id: localUserId,
      mapping_type: 'manual',
    });
    onClose();
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="lg">
      <DialogHeader>创建用户映射</DialogHeader>
      
      <DialogBody>
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel>飞书用户</FormLabel>
            <Select
              placeholder="选择飞书用户"
              value={feishuUserId}
              onChange={(e) => setFeishuUserId(e.target.value)}
            >
              {feishuUsers?.map((user) => (
                <option key={user.user_id} value={user.user_id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </Select>
          </FormControl>

          <FormControl isRequired>
            <FormLabel>本地用户</FormLabel>
            <Select
              placeholder="选择本地用户"
              value={localUserId}
              onChange={(e) => setLocalUserId(e.target.value)}
            >
              {localUsers?.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </Select>
          </FormControl>

          <Alert status="info">
            <AlertIcon />
            <AlertDescription>
              创建映射后，飞书用户的操作将被记录为本地用户的操作
            </AlertDescription>
          </Alert>
        </VStack>
      </DialogBody>

      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          取消
        </Button>
        <Button
          colorScheme="blue"
          onClick={handleCreate}
          disabled={!feishuUserId || !localUserId}
        >
          创建
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
```

---

## 3. 飞书同步状态显示

### 3.1 同步状态指示器

```tsx
// frontend/src/components/FeishuSyncStatus.tsx

import { useFeishuSyncStatus } from '@/hooks/useFeishuSyncStatus';

export function FeishuSyncStatus() {
  const { status, lastSyncAt, error } = useFeishuSyncStatus();

  const getStatusColor = () => {
    switch (status) {
      case 'syncing':
        return 'blue';
      case 'success':
        return 'green';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'syncing':
        return '同步中...';
      case 'success':
        return '同步成功';
      case 'error':
        return '同步失败';
      default:
        return '未同步';
    }
  };

  return (
    <HStack spacing={2}>
      <Badge colorScheme={getStatusColor()}>
        {getStatusText()}
      </Badge>
      {lastSyncAt && (
        <Text fontSize="sm" color="gray.600">
          最后同步：{formatRelativeTime(lastSyncAt)}
        </Text>
      )}
      {error && (
        <Tooltip label={error.message}>
          <IconButton
            icon={<InfoIcon />}
            aria-label="查看错误详情"
            size="xs"
            variant="ghost"
          />
        </Tooltip>
      )}
    </HStack>
  );
}
```

### 3.2 同步日志列表

```tsx
// frontend/src/components/FeishuSyncLogs.tsx

import { useFeishuSyncLogs } from '@/hooks/useFeishuSyncLogs';

export function FeishuSyncLogs() {
  const { logs, isLoading, fetchMore, hasMore } = useFeishuSyncLogs();

  return (
    <Card>
      <CardHeader>
        <Heading size="md">同步日志</Heading>
      </CardHeader>
      
      <CardBody>
        {isLoading ? (
          <Spinner />
        ) : (
          <VStack align="stretch" spacing={2}>
            {logs.map((log) => (
              <SyncLogItem key={log.id} log={log} />
            ))}
            
            {hasMore && (
              <Button onClick={fetchMore} variant="ghost">
                加载更多
              </Button>
            )}
          </VStack>
        )}
      </CardBody>
    </Card>
  );
}

function SyncLogItem({ log }: { log: FeishuSyncLog }) {
  return (
    <HStack
      p={3}
      borderWidth={1}
      borderRadius="md"
      justify="space-between"
    >
      <HStack>
        <Icon
          as={log.status === 'success' ? CheckCircleIcon : WarningIcon}
          color={log.status === 'success' ? 'green.500' : 'red.500'}
        />
        <VStack align="start" spacing={0}>
          <Text fontWeight="medium">{log.operation}</Text>
          <Text fontSize="sm" color="gray.600">
            {formatDate(log.created_at)}
          </Text>
        </VStack>
      </HStack>
      
      <VStack align="end" spacing={0}>
        <Text fontSize="sm">
          {log.records_synced} 条记录
        </Text>
        {log.error_message && (
          <Text fontSize="sm" color="red.500">
            {log.error_message}
          </Text>
        )}
      </VStack>
    </HStack>
  );
}
```

---

## 4. 飞书集成设置页面

### 4.1 设置页面布局

```tsx
// frontend/src/pages/FeishuSettingsPage.tsx

export function FeishuSettingsPage() {
  const { tenant, isLoading, updateTenant } = useFeishuTenant();

  return (
    <div className="container mx-auto p-6">
      <Heading size="lg" mb={6}>飞书集成设置</Heading>

      <Tabs>
        <TabList>
          <Tab>基本设置</Tab>
          <Tab>用户映射</Tab>
          <Tab>同步日志</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            <FeishuBasicSettings
              tenant={tenant}
              isLoading={isLoading}
              onUpdate={updateTenant}
            />
          </TabPanel>
          
          <TabPanel>
            <FeishuMappingPage />
          </TabPanel>
          
          <TabPanel>
            <FeishuSyncLogs />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </div>
  );
}
```

### 4.2 基本设置

```tsx
// frontend/src/components/FeishuBasicSettings.tsx

interface FeishuBasicSettingsProps {
  tenant: FeishuTenant | null;
  isLoading: boolean;
  onUpdate: (updates: Partial<FeishuTenant>) => void;
}

export function FeishuBasicSettings({ tenant, isLoading, onUpdate }: FeishuBasicSettingsProps) {
  const [appId, setAppId] = useState(tenant?.app_id || '');
  const [appSecret, setAppSecret] = useState('');
  const [autoSync, setAutoSync] = useState(tenant?.auto_sync || false);

  const handleSave = () => {
    onUpdate({
      app_id: appId,
      app_secret: appSecret || undefined,
      auto_sync: autoSync,
    });
  };

  if (isLoading) {
    return <Spinner />;
  }

  return (
    <VStack spacing={6} align="stretch">
      <Card>
        <CardHeader>
          <Heading size="md">应用配置</Heading>
        </CardHeader>
        
        <CardBody>
          <VStack spacing={4} align="stretch">
            <FormControl>
              <FormLabel>App ID</FormLabel>
              <Input
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                placeholder="cli_xxxxxxxxxxxxxxxx"
              />
            </FormControl>

            <FormControl>
              <FormLabel>App Secret</FormLabel>
              <Input
                type="password"
                value={appSecret}
                onChange={(e) => setAppSecret(e.target.value)}
                placeholder="留空表示不修改"
              />
              <FormHelperText>
                出于安全考虑，App Secret 不会显示
              </FormHelperText>
            </FormControl>

            <FormControl display="flex" alignItems="center">
              <FormLabel mb={0}>自动同步</FormLabel>
              <Switch
                isChecked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
              />
            </FormControl>
          </VStack>
        </CardBody>

        <CardFooter>
          <Button colorScheme="blue" onClick={handleSave}>
            保存设置
          </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader>
          <Heading size="md">连接状态</Heading>
        </CardHeader>
        
        <CardBody>
          <FeishuSyncStatus />
        </CardBody>
      </Card>
    </VStack>
  );
}
```

---

## 5. Hooks 实现

### 5.1 useFeishuMapping

```tsx
// frontend/src/hooks/useFeishuMapping.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useFeishuMapping() {
  const queryClient = useQueryClient();

  const { data: mappings, isLoading } = useQuery({
    queryKey: ['feishu', 'mappings'],
    queryFn: () => apiClient.get('/feishu/mappings'),
  });

  const createMapping = useMutation({
    mutationFn: (input: CreateMappingInput) =>
      apiClient.post('/feishu/mappings', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feishu', 'mappings'] });
    },
  });

  const deleteMapping = useMutation({
    mutationFn: (mappingId: string) =>
      apiClient.delete(`/feishu/mappings/${mappingId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['feishu', 'mappings'] });
    },
  });

  return {
    mappings,
    isLoading,
    createMapping: createMapping.mutate,
    deleteMapping: deleteMapping.mutate,
  };
}
```

### 5.2 useFeishuSyncStatus

```tsx
// frontend/src/hooks/useFeishuSyncStatus.ts

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useFeishuSyncStatus() {
  const { data, isLoading } = useQuery({
    queryKey: ['feishu', 'sync-status'],
    queryFn: () => apiClient.get('/feishu/sync-status'),
    refetchInterval: 10000, // 每 10 秒轮询一次
  });

  return {
    status: data?.status,
    lastSyncAt: data?.last_sync_at,
    error: data?.error,
    isLoading,
  };
}
```

---

## 6. 总结

### 6.1 核心功能

1. **飞书登录**：OAuth 2.0 授权流程
2. **用户映射**：飞书用户与本地用户的映射管理
3. **同步状态**：实时显示同步状态和日志
4. **设置管理**：飞书应用配置和自动同步开关

### 6.2 下一步

- 实现飞书消息推送到频道
- 实现飞书机器人命令
- 添加飞书日历集成

小张人呢？
