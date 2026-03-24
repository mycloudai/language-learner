#!/bin/bash
# 一键本地开发启动脚本
# 同时启动后端 API (port 3001) 和前端 Vite (port 5173)

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

# Suppress DEP0060 (util._extend) from transitive deps (needle via less/typescript-plugin-css-modules)
export NODE_NO_WARNINGS=1

echo "🚀 启动后端 API server (port 3001)..."
cd "$ROOT/server" && node server.js &
API_PID=$!

echo "🚀 启动前端 Vite dev server (port 5173)..."
cd "$ROOT" && yarn dev &
VITE_PID=$!

echo ""
echo "✅ 服务已启动:"
echo "   前端: http://localhost:5173"
echo "   AI句子练习: http://localhost:5173/sentence-practice"
echo "   后端 API: http://localhost:3001"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 捕获 Ctrl+C，同时关闭两个子进程
trap "echo ''; echo '正在停止...'; kill $API_PID $VITE_PID 2>/dev/null; exit 0" INT TERM

wait $API_PID $VITE_PID
