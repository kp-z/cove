# Migration Test

此目录用于存储从 claude_manager 迁移到 cove 的 UI 视觉评审材料。

## 目录结构

```
migration_test/
├── README.md                           # 本文件
└── YYYYMMDD-功能名称/                   # 按日期和功能分组
    ├── before/                         # 迁移前截图（claude_manager）
    │   ├── desktop-collapsed.png
    │   ├── desktop-expanded.png
    │   ├── mobile.png
    │   └── interactions.png
    ├── after/                          # 迁移后截图（cove）
    │   ├── desktop-collapsed.png
    │   ├── desktop-expanded.png
    │   ├── mobile.png
    │   └── interactions.png
    └── review.md                       # Agent 视觉评审报告
```

## 评审流程

### 1. 迁移前
- 运行 claude_manager 项目
- 截图保存到 `before/` 目录
- 记录关键视觉特征

### 2. 迁移后
- 运行 cove 项目
- 截图保存到 `after/` 目录
- Agent 对比分析并生成 `review.md`

### 3. 修复
- 根据评审报告修复问题
- 重新截图并评审
- 直到视觉完全一致

## 评审维度

- ✅ 布局结构是否一致
- ✅ 视觉层次是否保持
- ✅ 交互反馈是否相同
- ✅ 间距、颜色、字体是否一致
- ✅ 响应式行为是否相同

## 注意事项

- 这是 **Agent 主观评审**，不是自动化像素对比
- 评审报告应包含差异分析和修复建议
- 截图应覆盖多种状态和视口尺寸
