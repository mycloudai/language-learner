#!/bin/bash
# ==========================================================================
# Docker Build & Push Script - MyCloudAI Learner
# 构建前端 + API 两个镜像并推送到阿里云容器镜像仓库
# ==========================================================================

set -e

# 镜像仓库配置（按需修改）
REGISTRY="registry.cn-shanghai.aliyuncs.com"
NAMESPACE="jihaoyun"

# 两个镜像名
FRONTEND_IMAGE_NAME="mycloudai-learner-frontend"
API_IMAGE_NAME="mycloudai-learner-api"

FULL_FRONTEND="${REGISTRY}/${NAMESPACE}/${FRONTEND_IMAGE_NAME}"
FULL_API="${REGISTRY}/${NAMESPACE}/${API_IMAGE_NAME}"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 项目根目录（脚本所在的 deploy/ 的上一级）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  MyCloudAI Learner - Build & Push Images    ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""

# 检查 Docker 是否运行
echo -e "${YELLOW}检查 Docker 状态...${NC}"
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}错误: Docker 未运行，请先启动 Docker Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}Docker 运行正常${NC}"
echo ""

# 获取版本号
cd "$PROJECT_ROOT"
if [ -d .git ]; then
    if git rev-parse --verify HEAD >/dev/null 2>&1; then
        VERSION=$(git rev-parse --short HEAD)
        echo -e "${YELLOW}检测到 Git，使用 commit hash 作为版本: ${VERSION}${NC}"
    else
        VERSION=$(date +%Y%m%d-%H%M%S)
        echo -e "${YELLOW}Git 仓库无提交，使用时间戳作为版本: ${VERSION}${NC}"
    fi
else
    VERSION=$(date +%Y%m%d-%H%M%S)
    echo -e "${YELLOW}未检测到 Git，使用时间戳作为版本: ${VERSION}${NC}"
fi

# 询问是否自定义版本号
read -p "是否使用自定义版本号？(直接回车使用上述版本，或输入自定义版本): " CUSTOM_VERSION
if [ -n "$CUSTOM_VERSION" ]; then
    VERSION="$CUSTOM_VERSION"
    echo -e "${GREEN}使用自定义版本: ${VERSION}${NC}"
fi

# 询问目标平台
echo ""
echo -e "${YELLOW}选择目标平台:${NC}"
echo "  1. linux/amd64 (默认)"
echo "  2. linux/arm64"
echo "  3. linux/amd64,linux/arm64 (多平台)"
read -p "请选择 [1-3，默认 1]: " PLATFORM_CHOICE
case $PLATFORM_CHOICE in
    2) PLATFORM="linux/arm64" ;;
    3) PLATFORM="linux/amd64,linux/arm64" ;;
    *) PLATFORM="linux/amd64" ;;
esac
echo -e "${GREEN}目标平台: ${PLATFORM}${NC}"

# 选择构建目标
echo ""
echo -e "${YELLOW}选择构建目标:${NC}"
echo "  1. 全部（前端 + API）(默认)"
echo "  2. 仅前端"
echo "  3. 仅 API"
read -p "请选择 [1-3，默认 1]: " BUILD_CHOICE
BUILD_FRONTEND=true
BUILD_API=true
case $BUILD_CHOICE in
    2) BUILD_API=false ;;
    3) BUILD_FRONTEND=false ;;
    *) ;;
esac

echo ""
echo -e "${GREEN}将构建以下镜像:${NC}"
if $BUILD_FRONTEND; then
    echo -e "  Frontend: ${FULL_FRONTEND}:${VERSION}"
    echo -e "            ${FULL_FRONTEND}:latest"
fi
if $BUILD_API; then
    echo -e "  API:      ${FULL_API}:${VERSION}"
    echo -e "            ${FULL_API}:latest"
fi
echo -e "  平台: ${PLATFORM}"
echo ""

# 询问 Docker 仓库账号密码
read -p "请输入阿里云镜像仓库用户名: " DOCKER_USERNAME
read -s -p "请输入阿里云镜像仓库密码: " DOCKER_PASSWORD
echo ""
echo ""

if [ -z "$DOCKER_USERNAME" ] || [ -z "$DOCKER_PASSWORD" ]; then
    echo -e "${RED}错误: 用户名或密码不能为空${NC}"
    exit 1
fi

# 登录 Docker 仓库
echo -e "${YELLOW}正在登录到 ${REGISTRY}...${NC}"
echo "$DOCKER_PASSWORD" | docker login --username "$DOCKER_USERNAME" --password-stdin "$REGISTRY" 2>&1

if [ $? -ne 0 ]; then
    echo ""
    echo -e "${YELLOW}如果遇到证书验证错误，请检查:${NC}"
    echo -e "  1. Docker Desktop 是否正常运行"
    echo -e "  2. 系统时间是否准确"
    echo -e "  3. 尝试重启 Docker Desktop"
    echo ""
    echo -e "${RED}登录失败，请检查账号密码或网络连接${NC}"
    exit 1
fi
echo -e "${GREEN}登录成功！${NC}"
echo ""

# 构建 API 镜像
if $BUILD_API; then
    echo -e "${YELLOW}[1/2] 正在构建 API 镜像...${NC}"
    docker buildx build \
        --platform "$PLATFORM" \
        -f "$SCRIPT_DIR/Dockerfile.api" \
        -t "${FULL_API}:${VERSION}" \
        -t "${FULL_API}:latest" \
        --push \
        "$PROJECT_ROOT"

    if [ $? -ne 0 ]; then
        echo -e "${RED}API 镜像构建失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}API 镜像构建成功！${NC}"
    echo ""
fi

# 构建前端镜像
if $BUILD_FRONTEND; then
    echo -e "${YELLOW}[2/2] 正在构建前端镜像...${NC}"
    docker buildx build \
        --platform "$PLATFORM" \
        -f "$SCRIPT_DIR/Dockerfile.frontend" \
        -t "${FULL_FRONTEND}:${VERSION}" \
        -t "${FULL_FRONTEND}:latest" \
        --push \
        "$PROJECT_ROOT"

    if [ $? -ne 0 ]; then
        echo -e "${RED}前端镜像构建失败${NC}"
        exit 1
    fi
    echo -e "${GREEN}前端镜像构建成功！${NC}"
    echo ""
fi

echo ""
echo -e "${GREEN}===========================================${NC}"
echo -e "${GREEN}  🎉 构建和推送完成！${NC}"
echo -e "${GREEN}===========================================${NC}"
echo ""
echo -e "镜像已推送到:"
if $BUILD_FRONTEND; then
    echo -e "  ${GREEN}${FULL_FRONTEND}:${VERSION}${NC}"
    echo -e "  ${GREEN}${FULL_FRONTEND}:latest${NC}"
fi
if $BUILD_API; then
    echo -e "  ${GREEN}${FULL_API}:${VERSION}${NC}"
    echo -e "  ${GREEN}${FULL_API}:latest${NC}"
fi
echo ""
echo -e "平台支持: ${YELLOW}${PLATFORM}${NC}"
echo ""
echo -e "更新 docker-compose.yaml 中的版本号:"
echo -e "  ${YELLOW}FRONTEND_TAG=${VERSION} API_TAG=${VERSION} docker compose up -d${NC}"
echo ""
echo -e "更新 K8s Deployment:"
echo -e "  ${YELLOW}kubectl set image deployment/frontend frontend=${FULL_FRONTEND}:${VERSION} -n mycloudai-learner${NC}"
echo -e "  ${YELLOW}kubectl set image deployment/api api=${FULL_API}:${VERSION} -n mycloudai-learner${NC}"
echo ""
