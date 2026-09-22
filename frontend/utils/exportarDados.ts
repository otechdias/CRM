import * as XLSX from "xlsx";

type LinhaExportacao = Record<string, unknown>;

const normalizarValor = (valor: unknown): string | number => {
  if (valor === null || valor === undefined) {
    return "";
  }

  if (Array.isArray(valor)) {
    return valor.join(", ");
  }

  if (typeof valor === "boolean") {
    return valor ? "Sim" : "Não";
  }

  if (typeof valor === "object") {
    return JSON.stringify(valor);
  }

  return String(valor);
};

export const exportarCSV = (
  dados: LinhaExportacao[],
  nomeArquivo: string
) => {
  if (!dados.length) {
    alert("Não existem dados para exportar.");
    return;
  }

  const colunas = Array.from(
    new Set(dados.flatMap((item) => Object.keys(item)))
  );

  const linhas = dados.map((item) =>
    colunas.map((coluna) => {
      const valor = normalizarValor(item[coluna]);

      return `"${String(valor).replace(/"/g, '""')}"`;
    })
  );

  const csv = [
    colunas.map((coluna) => `"${coluna}"`).join(";"),
    ...linhas.map((linha) => linha.join(";")),
  ].join("\n");

  const blob = new Blob(
    ["\uFEFF" + csv],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = `${nomeArquivo}.csv`;

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

export const exportarXLSX = (
  dados: LinhaExportacao[],
  nomeArquivo: string
) => {
  if (!dados.length) {
    alert("Não existem dados para exportar.");
    return;
  }

  const dadosFormatados = dados.map((item) => {
    const novo: LinhaExportacao = {};

    Object.entries(item).forEach(([chave, valor]) => {
      novo[chave] = normalizarValor(valor);
    });

    return novo;
  });

  const worksheet = XLSX.utils.json_to_sheet(
    dadosFormatados
  );

  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Dados"
  );

  XLSX.writeFile(
    workbook,
    `${nomeArquivo}.xlsx`
  );
};