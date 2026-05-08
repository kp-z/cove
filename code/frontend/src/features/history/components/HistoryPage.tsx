export default function HistoryPage() {
  return (
    <div className="h-full flex flex-col bg-[#0f111a]">
      {/* 头部 */}
      <header className="h-14 border-b border-[#2a2d3e] flex items-center px-6 bg-[#1a1d2e]">
        <h2 className="text-lg font-semibold">History</h2>
      </header>

      {/* 内容区 */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-[#1a1d2e] border border-[#2a2d3e] rounded-lg p-6">
            <h3 className="text-xl font-semibold mb-4">📜 Execution History</h3>
            <p className="text-[#9ca3af]">
              Workflow execution history coming soon...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
