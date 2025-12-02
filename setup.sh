#!/bin/bash
# 🚀 Script de Setup - Gerenciador de Despesas

echo "📊 Gerenciador de Despesas - Setup"
echo "===================================="
echo ""

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instale em: https://nodejs.org"
    exit 1
fi

echo "✅ Node.js $(node --version) encontrado"
echo "✅ npm $(npm --version) encontrado"
echo ""

# Instalar dependências
echo "📦 Instalando dependências..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Erro ao instalar dependências"
    exit 1
fi

echo "✅ Dependências instaladas!"
echo ""

# Build
echo "🏗️  Compilando projeto..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Erro no build"
    exit 1
fi

echo "✅ Build concluído!"
echo ""

echo "🎉 Setup finalizado com sucesso!"
echo ""
echo "Para iniciar o desenvolvimento, execute:"
echo "  npm run dev"
echo ""
echo "Para iniciar em produção, execute:"
echo "  npm start"
echo ""
echo "📖 Documentação:"
echo "  - FEATURES.md - Funcionalidades"
echo "  - QUICKSTART.md - Início rápido"
echo "  - TECHNICAL.md - Documentação técnica"
