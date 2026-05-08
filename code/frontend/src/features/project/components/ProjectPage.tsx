export default function ProjectPage() {
  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <header className="h-16 border-b border-dark-border flex items-center px-6">
        <h2 className="text-lg font-semibold">项目管理</h2>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="card">
            <h3 className="text-xl font-semibold mb-4">📁 项目管理</h3>
            <p className="text-dark-text-secondary">
              这里将实现项目创建、成员管理、资源配置和项目监控功能。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
