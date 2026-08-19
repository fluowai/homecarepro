import * as xlsx from 'xlsx';

const data = [
  ['ID', 'NOME', 'COL C', 'COL D', 'ESCALA', 'DATA', 'G', 'H'],
  ['6', 'ZULEIDA', '180/130/140', '250/200/180', '24h segundas /12h sabados /9h quintas', '', '', ''],
  ['7', 'ELZA', 'R$ 170.00', '200.00', '24h - 16 a 18 dias', '3/2/2026', '', ''],
  ['8', 'TITO', 'R$ 1,460.00', '180.00', '12h- 12 a 13 dias', '6/2/2026', '', ''],
  ['9', 'EDITHE LEITE', 'R$ 1,776.00', '230.00', '24h - 30 a 31 dias', '6/19/2026', '', 'ESCALA 24...'],
  ['10', 'VÂNIA', 'R$ 190.00', '255.00', '24h - 30 a 31 dias', '7/14/2026', '', ''],
  ['11', 'NELY', 'R$ 1,900.00', '255.00', '24h - segunda,terça e sexta 12 a 13 dias', '7/23/2026', '', ''],
  ['12', 'ODETE ALVES', 'R$ 2,420.00', '175.00', '8h - 20 dias', '28/07/2026', '', ''],
  ['13', 'NINA', 'R$ 180.00', '250.00', '24h - 30 a 31 dias', '8/3/2026', '', ''],
  ['14', 'HELMA', '1950x2', '190.00', '12h - 30 a 31 dias', '8/10/2026', '', ''],
];

const wb = xlsx.utils.book_new();
const ws = xlsx.utils.aoa_to_sheet(data);
xlsx.utils.book_append_sheet(wb, ws, 'CLIENTES');
xlsx.utils.book_append_sheet(wb, xlsx.utils.aoa_to_sheet([['NOME', 'FUNÇÃO'], ['Ana', 'Enfermeira']]), 'COLABORADORES');

xlsx.writeFile(wb, 'planilha_sc.xlsx');
console.log('planilha_sc.xlsx criada com os dados vistos no screenshot!');
