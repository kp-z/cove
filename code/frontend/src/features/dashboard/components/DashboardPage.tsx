export default function DashboardPage() {
  return (
    <div className="h-full flex flex-col">
      {/* 头部 */}
      <header className="h-14 border-b border-[#2a2d3e] flex items-center px-6">
        <h2 className="text-lg font-semibold">Dashboard</h2>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto">
          {/* 欢迎卡片 */}
          <div className="bg-gradient-to-br from-blue-500/10 to-purple-600/10 border border-blue-500/20 rounded-xl p-8 mb-6">
            <h1 className="text-3xl font-bold mb-2">Welcome to Cove</h1>
            <p className="text-[#9ca3af] text-lg">
              AI Agent 协作平台 - 统一管理和编排 AI Agent
            </p>
          </div>

          {/* 快速操作 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 hover:border-blue-500/50 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold mb-2">Start Chat</h3>
              <p className="text-sm text-[#9ca3af]">与 AI Agent 开始对话</p>
            </div>

            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 hover:border-blue-500/50 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="font-semibold mb-2">Manage Agents</h3>
              <p className="text-sm text-[#9ca3af]">创建和管理 AI Agent</p>
            </div>

            <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6 hover:border-blue-500/50 transition-colors cursor-pointer">
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                <span className="text-2xl">🔄</span>
              </div>
              <h3 className="font-semibold mb-2">Create Workflow</h3>
              <p className="text-sm text-[#9ca3af]">设计工作流编排</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
