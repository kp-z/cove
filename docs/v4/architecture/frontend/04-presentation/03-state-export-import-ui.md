# State Export/Import UI Design (状态导出导入 UI 设计)

> **版本**: v4.0  
> **日期**: 2026-05-07  
> **关键词**: `状态导出`, `状态导入`, `UI设计`, `用户体验`, `错误处理`, `预览`

**本文档包含**:
- Agent 状态导出/导入的完整 UI 设计
- 用户交互流程和状态反馈
- 错误处理和边界情况
- 可访问性设计

**适用场景**:
- 实现 Agent 状态导出/导入功能
- 设计类似的数据导入导出 UI
- 理解用户体验设计原则

**相关文档**:
- [Feature Call Flows](./02-feature-flows.md) - 功能调用流程
- [Backend API](../../backend/03-infrastructure/04-backend-api.md) - 后端 API 设计

---

## 1. 功能概述

### 1.1 用户故事

**作为用户，我希望能够**:
- 导出 Agent 的完整运行时状态（memory、skills、config）
- 将导出的状态导入到另一个 Agent
- 在导入前预览状态内容
- 了解导入操作的影响范围
- 在导入失败时获得清晰的错误提示

### 1.2 核心场景

1. **Agent 迁移**：将 Agent 从一个环境迁移到另一个环境
2. **状态备份**：定期备份 Agent 状态
3. **状态恢复**：从备份恢复 Agent 状态
4. **Agent 克隆**：基于现有 Agent 创建新 Agent

---

## 2. 导出 UI 设计

### 2.1 入口位置

**位置**: Agent 详情页 → 右上角操作菜单

```tsx
<AgentDetailPage>
  <Header>
    <Title>Agent: {agent.name}</Title>
    <DropdownMenu>
      <DropdownMenuItem onClick={handleExport}>
        <DownloadIcon />
        导出状态
      </DropdownMenuItem>
      <DropdownMenuItem onClick={handleImport}>
        <UploadIcon />
        导入状态
      </DropdownMenuItem>
    </DropdownMenu>
  </Header>
</AgentDetailPage>
```

### 2.2 导出流程

#### 步骤 1: 用户点击"导出状态"

```tsx
function ExportStateButton({ agentId }) {
  const { exportState, isExporting } = useAgent(agentId);

  return (
    <Button
      onClick={exportState}
      disabled={isExporting}
      leftIcon={<DownloadIcon />}
    >
      {isExporting ? '导出中...' : '导出状态'}
    </Button>
  );
}
```

#### 步骤 2: 显示加载状态

```tsx
{isExporting && (
  <Alert status="info">
    <Spinner size="sm" />
    <AlertDescription>
      正在导出 Agent 状态，请稍候...
      {agent.status === 'running' && (
        <Text fontSize="sm" color="gray.600">
          Agent 将暂时暂停以确保状态一致性
        </Text>
      )}
    </AlertDescription>
  </Alert>
)}
```

#### 步骤 3: 自动下载 JSON 文件

```tsx
const exportState = useMutation({
  mutationFn: () => apiClient.post(`/agents/${agentId}/export-state`),
  onSuccess: (data) => {
    // 创建下载链接
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${agentId}-state-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    // 显示成功提示
    toast({
      title: '导出成功',
      description: `已保存为 ${a.download}`,
      status: 'success',
    });
  },
  onError: (err) => {
    toast({
      title: '导出失败',
      description: err.message,
      status: 'error',
    });
  },
});
```

### 2.3 导出文件格式预览

```json
{
  "export_id": "exp_abc123",
  "agent_id": "agt_xyz789",
  "framework": "runtime",
  "exported_at": "2026-05-07T10:30:00Z",
  "metadata": {
    "agent_name": "MyAgent",
    "agent_type": "assistant",
    "version": "1.0.0"
  },
  "runtime_state": {
    "memory": {
      "conversations": [...],
      "context": {...}
    },
    "skills": [...],
    "config": {...}
  }
}
```

---

## 3. 导入 UI 设计

### 3.1 导入对话框

```tsx
function ImportStateDialog({ agentId, isOpen, onClose }) {
  const [file, setFile] = useState<File | null>(null);
  const [stateData, setStateData] = useState<AgentState | null>(null);
  const [step, setStep] = useState<'select' | 'preview' | 'confirm'>('select');
  const { importState, isImporting } = useAgent(agentId);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        setStateData(data);
        setStep('preview');
      } catch (err) {
        toast({
          title: '文件解析失败',
          description: '请选择有效的 JSON 文件',
          status: 'error',
        });
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleImport = () => {
    if (!stateData) return;
    importState(stateData);
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} size="xl">
      <DialogHeader>导入 Agent 状态</DialogHeader>
      
      <DialogBody>
        {step === 'select' && (
          <FileSelectStep onFileSelect={handleFileSelect} />
        )}
        
        {step === 'preview' && stateData && (
          <PreviewStep
            stateData={stateData}
            onBack={() => setStep('select')}
            onConfirm={() => setStep('confirm')}
          />
        )}
        
        {step === 'confirm' && stateData && (
          <ConfirmStep
            stateData={stateData}
            onBack={() => setStep('preview')}
            onConfirm={handleImport}
            isImporting={isImporting}
          />
        )}
      </DialogBody>
    </Dialog>
  );
}
```

### 3.2 步骤 1: 文件选择

```tsx
function FileSelectStep({ onFileSelect }) {
  return (
    <VStack spacing={4} align="stretch">
      <Text>选择要导入的 Agent 状态文件（JSON 格式）</Text>
      
      <FormControl>
        <FormLabel>选择文件</FormLabel>
        <Input
          type="file"
          accept=".json"
          onChange={onFileSelect}
        />
        <FormHelperText>
          支持的文件格式：.json
        </FormHelperText>
      </FormControl>

      <Alert status="info">
        <AlertIcon />
        <AlertDescription>
          导入操作将覆盖当前 Agent 的运行时状态，包括 memory、skills 和 config。
          建议在导入前先导出当前状态作为备份。
        </AlertDescription>
      </Alert>
    </VStack>
  );
}
```

### 3.3 步骤 2: 状态预览

```tsx
function PreviewStep({ stateData, onBack, onConfirm }) {
  const { agent } = useAgent(agentId);

  return (
    <VStack spacing={4} align="stretch">
      <Heading size="md">状态预览</Heading>

      <Grid templateColumns="1fr 1fr" gap={4}>
        <GridItem>
          <Card>
            <CardHeader>
              <Heading size="sm">源 Agent</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="start" spacing={2}>
                <Text><strong>名称:</strong> {stateData.metadata.agent_name}</Text>
                <Text><strong>类型:</strong> {stateData.metadata.agent_type}</Text>
                <Text><strong>Framework:</strong> {stateData.framework}</Text>
                <Text><strong>导出时间:</strong> {formatDate(stateData.exported_at)}</Text>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        <GridItem>
          <Card>
            <CardHeader>
              <Heading size="sm">目标 Agent</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="start" spacing={2}>
                <Text><strong>名称:</strong> {agent.name}</Text>
                <Text><strong>类型:</strong> {agent.type}</Text>
                <Text><strong>Framework:</strong> {agent.framework}</Text>
                <Text><strong>当前状态:</strong> {agent.status}</Text>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      <Divider />

      <Heading size="sm">将导入的内容</Heading>
      <VStack align="start" spacing={2}>
        <HStack>
          <CheckIcon color="green.500" />
          <Text>Memory ({stateData.runtime_state.memory.conversations.length} 条对话)</Text>
        </HStack>
        <HStack>
          <CheckIcon color="green.500" />
          <Text>Skills ({stateData.runtime_state.skills.length} 个技能)</Text>
        </HStack>
        <HStack>
          <CheckIcon color="green.500" />
          <Text>Config (配置项)</Text>
        </HStack>
      </VStack>

      {stateData.framework !== agent.framework && (
        <Alert status="warning">
          <AlertIcon />
          <AlertDescription>
            警告：源 Agent 和目标 Agent 的 Framework 不匹配
            （{stateData.framework} → {agent.framework}），
            导入可能失败。
          </AlertDescription>
        </Alert>
      )}

      <HStack justify="space-between">
        <Button variant="ghost" onClick={onBack}>
          返回
        </Button>
        <Button colorScheme="blue" onClick={onConfirm}>
          继续
        </Button>
      </HStack>
    </VStack>
  );
}
```

### 3.4 步骤 3: 确认导入

```tsx
function ConfirmStep({ stateData, onBack, onConfirm, isImporting }) {
  const [confirmed, setConfirmed] = useState(false);

  return (
    <VStack spacing={4} align="stretch">
      <Alert status="warning">
        <AlertIcon />
        <AlertDescription>
          <strong>重要提示：</strong>
          <ul style={{ marginTop: '8px', paddingLeft: '20px' }}>
            <li>导入操作将覆盖当前 Agent 的所有运行时状态</li>
            <li>如果 Agent 正在运行，将被强制停止</li>
            <li>此操作不可撤销，建议先备份当前状态</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Checkbox
        isChecked={confirmed}
        onChange={(e) => setConfirmed(e.target.checked)}
      >
        我已了解风险，确认执行导入操作
      </Checkbox>

      <HStack justify="space-between">
        <Button variant="ghost" onClick={onBack} disabled={isImporting}>
          返回
        </Button>
        <Button
          colorScheme="red"
          onClick={onConfirm}
          disabled={!confirmed || isImporting}
          isLoading={isImporting}
          loadingText="导入中..."
        >
          确认导入
        </Button>
      </HStack>
    </VStack>
  );
}
```

### 3.5 导入成功/失败反馈

```tsx
const importState = useMutation({
  mutationFn: (state) => apiClient.post(`/agents/${agentId}/import-state`, state),
  onSuccess: () => {
    toast({
      title: '导入成功',
      description: 'Agent 状态已成功导入并重启',
      status: 'success',
      duration: 5000,
    });
    queryClient.invalidateQueries(['agent', agentId]);
    onClose();
  },
  onError: (err) => {
    toast({
      title: '导入失败',
      description: err.response?.data?.message || err.message,
      status: 'error',
      duration: 10000,
      isClosable: true,
    });
  },
});
```

---

## 4. 边界情况处理

### 4.1 Agent 正在运行

```tsx
{agent.status === 'running' && (
  <Alert status="warning">
    <AlertIcon />
    <AlertDescription>
      Agent 当前正在运行，导入操作将强制停止 Agent。
      建议先手动停止 Agent 后再导入。
    </AlertDescription>
  </Alert>
)}
```

### 4.2 Framework 不匹配

```tsx
{stateData.framework !== agent.framework && (
  <Alert status="error">
    <AlertIcon />
    <AlertDescription>
      Framework 不匹配：源 Agent 使用 {stateData.framework}，
      目标 Agent 使用 {agent.framework}。
      导入操作将被拒绝。
    </AlertDescription>
  </Alert>
)}
```

### 4.3 文件格式错误

```tsx
try {
  const data = JSON.parse(fileContent);
  
  // 验证必需字段
  if (!data.export_id || !data.framework || !data.runtime_state) {
    throw new Error('文件格式不正确：缺少必需字段');
  }
  
  setStateData(data);
} catch (err) {
  toast({
    title: '文件解析失败',
    description: err.message,
    status: 'error',
  });
}
```

### 4.4 导入超时

```tsx
const importState = useMutation({
  mutationFn: (state) => apiClient.post(`/agents/${agentId}/import-state`, state, {
    timeout: 60000, // 60 秒超时
  }),
  onError: (err) => {
    if (err.code === 'ECONNABORTED') {
      toast({
        title: '导入超时',
        description: '导入操作超时，请检查网络连接或稍后重试',
        status: 'error',
      });
    }
  },
});
```

---

## 5. 可访问性设计

### 5.1 键盘导航

```tsx
<Dialog
  isOpen={isOpen}
  onClose={onClose}
  initialFocusRef={fileInputRef}
  finalFocusRef={triggerRef}
>
  <DialogBody>
    <Input
      ref={fileInputRef}
      type="file"
      accept=".json"
      onChange={handleFileSelect}
      aria-label="选择 Agent 状态文件"
    />
  </DialogBody>
</Dialog>
```

### 5.2 屏幕阅读器支持

```tsx
<Button
  onClick={exportState}
  aria-label="导出 Agent 状态到 JSON 文件"
  aria-busy={isExporting}
>
  {isExporting ? '导出中...' : '导出状态'}
</Button>

<Alert status="info" role="status" aria-live="polite">
  <AlertDescription>
    正在导出 Agent 状态，请稍候...
  </AlertDescription>
</Alert>
```

### 5.3 加载状态反馈

```tsx
{isImporting && (
  <Progress
    value={progress}
    size="sm"
    colorScheme="blue"
    aria-label="导入进度"
  />
)}
```

---

## 6. 性能优化

### 6.1 大文件处理

```tsx
const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // 检查文件大小（限制 10MB）
  if (file.size > 10 * 1024 * 1024) {
    toast({
      title: '文件过大',
      description: '文件大小不能超过 10MB',
      status: 'error',
    });
    return;
  }

  // 使用 Web Worker 解析大文件
  const worker = new Worker('/workers/json-parser.js');
  worker.postMessage({ file });
  worker.onmessage = (e) => {
    setStateData(e.data);
    setStep('preview');
  };
};
```

### 6.2 预览数据截断

```tsx
function PreviewStep({ stateData }) {
  const conversationCount = stateData.runtime_state.memory.conversations.length;
  const previewConversations = stateData.runtime_state.memory.conversations.slice(0, 5);

  return (
    <VStack>
      <Text>Memory 预览（显示前 5 条对话）</Text>
      {previewConversations.map((conv) => (
        <ConversationPreview key={conv.id} conversation={conv} />
      ))}
      {conversationCount > 5 && (
        <Text color="gray.600">
          还有 {conversationCount - 5} 条对话未显示
        </Text>
      )}
    </VStack>
  );
}
```

---

## 7. 总结

### 7.1 关键设计原则

1. **清晰的用户反馈**：每个步骤都有明确的状态提示
2. **风险提示**：在执行危险操作前充分告知用户
3. **可逆性**：鼓励用户在导入前备份
4. **错误处理**：提供清晰的错误信息和恢复建议
5. **可访问性**：支持键盘导航和屏幕阅读器

### 7.2 下一步

- 阅读 [飞书集成](./04-feishu-integration-ui.md) 了解飞书集成方案
- 阅读 [API Integration](./01-api-integration.md) 了解 API 调用方式
- 阅读 [Feature Call Flows](./02-feature-flows.md) 了解完整的功能调用流程
