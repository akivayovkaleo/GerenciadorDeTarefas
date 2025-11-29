// Utilitários
function hoje() {
  return new Date().toISOString().split('T')[0]; // "2025-11-29"
}

function formatarMoeda(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
}

// Alternar telas
document.getElementById('btn-medias').addEventListener('click', () => {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById('tela-medias').classList.add('ativa');
  document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-medias').classList.add('active');
});

document.getElementById('btn-despesas').addEventListener('click', () => {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  document.getElementById('tela-despesas').classList.add('ativa');
  document.querySelectorAll('.sidebar button').forEach(b => b.classList.remove('active'));
  document.getElementById('btn-despesas').classList.add('active');
  renderizarLancamentos(); // atualiza lista ao entrar
});

// ============ TELA DE MÉDIAS ============
document.getElementById('data-lanc').value = hoje();

// Registrar faturamento do dia
document.getElementById('btn-registrar').addEventListener('click', () => {
  const valorInput = document.getElementById('valor-dia');
  const valor = parseFloat(valorInput.value);
  if (isNaN(valor) || valor <= 0) {
    alert('Digite um valor válido.');
    return;
  }

  let entradas = JSON.parse(localStorage.getItem('entradas_diarias') || '[]');
  entradas.push({
    data: hoje(),
    valor: valor
  });
  localStorage.setItem('entradas_diarias', JSON.stringify(entradas));
  valorInput.value = '';
  alert('Entrada registrada com sucesso!');
});

// Calcular e exibir médias
function calcularMediaDia(diaAlvo) {
  const entradas = JSON.parse(localStorage.getItem('entradas_diarias') || '[]');
  const doMesmoDia = entradas.filter(e => {
    const dia = new Date(e.data).getDate();
    return dia === diaAlvo;
  });
  if (doMesmoDia.length === 0) return null;
  const soma = doMesmoDia.reduce((acc, e) => acc + e.valor, 0);
  return soma / doMesmoDia.length;
}

function calcularMediaSemana() {
  const entradas = JSON.parse(localStorage.getItem('entradas_diarias') || '[]');
  const hoje = new Date();
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(hoje.getDate() - 7);
  const ultimos7 = entradas.filter(e => new Date(e.data) >= seteDiasAtras);
  if (ultimos7.length === 0) return null;
  const soma = ultimos7.reduce((acc, e) => acc + e.valor, 0);
  return soma / ultimos7.length;
}

function calcularMediaMes() {
  const entradas = JSON.parse(localStorage.getItem('entradas_diarias') || '[]');
  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();
  const doMes = entradas.filter(e => {
    const d = new Date(e.data);
    return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
  });
  if (doMes.length === 0) return null;
  const soma = doMes.reduce((acc, e) => acc + e.valor, 0);
  return soma / doMes.length;
}

// Botões de média
document.getElementById('btn-dia').addEventListener('click', () => {
  const dia = new Date().getDate();
  const media = calcularMediaDia(dia);
  const res = document.getElementById('resultado-media');
  if (media !== null) {
    res.innerHTML = `Média do dia ${dia}: ${formatarMoeda(media)}`;
  } else {
    res.innerHTML = `Nenhuma entrada registrada para o dia ${dia}.`;
  }
});

document.getElementById('btn-semana').addEventListener('click', () => {
  const media = calcularMediaSemana();
  const res = document.getElementById('resultado-media');
  if (media !== null) {
    res.innerHTML = `Média dos últimos 7 dias: ${formatarMoeda(media)}`;
  } else {
    res.innerHTML = `Nenhuma entrada nos últimos 7 dias.`;
  }
});

document.getElementById('btn-mes').addEventListener('click', () => {
  const media = calcularMediaMes();
  const res = document.getElementById('resultado-media');
  if (media !== null) {
    const mesNome = new Date().toLocaleString('pt-BR', { month: 'long' });
    res.innerHTML = `Média de ${mesNome}: ${formatarMoeda(media)}`;
  } else {
    res.innerHTML = `Nenhuma entrada este mês.`;
  }
});

// ============ TELA DE DESPESAS ============
document.getElementById('data-lanc').value = hoje();

document.getElementById('btn-adicionar-lanc').addEventListener('click', () => {
  const tipo = document.querySelector('input[name="tipo"]:checked').value;
  const valor = parseFloat(document.getElementById('valor-lanc').value);
  const descricao = document.getElementById('descricao').value.trim();
  const data = document.getElementById('data-lanc').value;

  if (isNaN(valor) || valor <= 0) {
    alert('Valor inválido.');
    return;
  }
  if (!descricao) {
    alert('Descrição obrigatória.');
    return;
  }
  if (!data) {
    alert('Selecione uma data.');
    return;
  }

  let lancamentos = JSON.parse(localStorage.getItem('lancamentos') || '[]');
  lancamentos.push({ tipo, valor, descricao, data });
  localStorage.setItem('lancamentos', JSON.stringify(lancamentos));

  // Limpar formulário
  document.getElementById('valor-lanc').value = '';
  document.getElementById('descricao').value = '';
  document.getElementById('data-lanc').value = hoje();

  renderizarLancamentos();
});

function renderizarLancamentos() {
  const lancamentos = JSON.parse(localStorage.getItem('lancamentos') || '[]');
  const lista = document.getElementById('lista-lancamentos');
  const totais = document.getElementById('totais');

  // Ordenar por data (mais recente primeiro)
  lancamentos.sort((a, b) => new Date(b.data) - new Date(a.data));

  lista.innerHTML = '';
  let totalReceitas = 0;
  let totalDespesas = 0;

  lancamentos.forEach(l => {
    const div = document.createElement('div');
    div.className = l.tipo === 'despesa' ? 'despesa' : 'receita';
    const dataFormatada = new Date(l.data).toLocaleDateString('pt-BR');
    div.innerHTML = `
      <strong>${dataFormatada}</strong> | 
      ${l.descricao} | 
      ${l.tipo === 'receita' ? '+' : '-'}${formatarMoeda(l.valor)}
    `;
    lista.appendChild(div);

    if (l.tipo === 'receita') totalReceitas += l.valor;
    else totalDespesas += l.valor;
  });

  const saldo = totalReceitas - totalDespesas;
  totais.innerHTML = `
    <div>Receitas: ${formatarMoeda(totalReceitas)}</div>
    <div>Despesas: ${formatarMoeda(totalDespesas)}</div>
    <div style="color: ${saldo >= 0 ? 'green' : 'red'}">Saldo: ${formatarMoeda(saldo)}</div>
  `;
}